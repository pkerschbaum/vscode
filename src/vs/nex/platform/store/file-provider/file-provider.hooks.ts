import { shell } from 'electron';

import * as resources from 'vs/base/common/resources';
import * as uuid from 'vs/base/common/uuid';
import { extname, basename } from 'vs/base/common/path';
import { Constants } from 'vs/base/common/uint';
import { isLinux } from 'vs/base/common/platform';
import { URI, UriComponents } from 'vs/base/common/uri';
import { FileKind, IFileStat, IFileStatWithMetadata } from 'vs/platform/files/common/files';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';

import { actions } from 'vs/nex/platform/store/file-provider/file-provider.slice';
import { mapFileStatToFile } from 'vs/nex/platform/logic/file-system';
import { useModelService } from 'vs/nex/ui/ModelService.provider';
import { useModeService } from 'vs/nex/ui/ModeService.provider';
import { useNexFileSystem } from 'vs/nex/ui/NexFileSystem.provider';
import { useDispatch, useSelector } from 'vs/nex/platform/store/store';
import { FileType, ResourceScheme, FileStatMap } from 'vs/nex/platform/file-types';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { createLogger } from 'vs/nex/base/logger/logger';
import { objects } from 'vs/nex/base/utils/objects.util';

const UPDATE_INTERVAL_MS = 300;
const logger = createLogger('file-provider.hooks');

export function useFileProviderState() {
	const modelService = useModelService();
	const modeService = useModeService();

	return useSelector((state) => {
		return {
			...state.fileProvider,
			files: Object.values(state.fileProvider.files)
				.filter(objects.isNotNullish)
				.map((file) => {
					const baseName = extractBaseName(file.uri.path);
					const { fileName, extension } = extractNameAndExtension(baseName, file.fileType);
					const fileType = mapFileTypeToFileKind(file.fileType);

					const iconClasses = getIconClasses(
						modelService,
						modeService,
						URI.from(file.uri),
						fileType,
					);

					return {
						id: file.id,
						uri: file.uri,
						type: file.fileType,
						extension,
						iconClasses,
						name: fileName,
						size: file.size,
						lastChangedAt: file.lastChangedAt,
					};
				}),
		};
	});
}

function extractBaseName(filePath: string): string {
	const extractFilename = /[^/]+$/g.exec(filePath);
	if (!extractFilename) {
		throw new Error(`could not extract file name from file path. path: ${filePath}`);
	}

	return extractFilename[0];
}

function extractNameAndExtension(
	baseName: string,
	fileType: FileType,
): { fileName: string; extension?: string } {
	let fileName;
	let extension;

	if (fileType === FileType.Directory) {
		fileName = baseName;
	} else {
		const nameParts = baseName.split(/\.(?=[^.]*$)/g);
		if (nameParts[0] === '') {
			// e.g. baseName was ".backup"
			fileName = `.${nameParts[1]}`; // ".backup"
		} else {
			[fileName, extension] = nameParts;
		}
	}

	return { fileName, extension };
}

function mapFileTypeToFileKind(fileType: FileType): FileKind {
	if (fileType === FileType.File) {
		return FileKind.FILE;
	} else if (fileType === FileType.Directory) {
		return FileKind.FOLDER;
	} else {
		throw new Error(`could not map FileType to FileKind, FileType is: ${fileType}`);
	}
}

export const useFileProviderThunks = () => {
	const fileSystem = useNexFileSystem();
	const dispatch = useDispatch();
	const { cwd, filesToPaste, pasteShouldMove } = useFileProviderState();

	async function updateFilesOfCwd(cwd: UriComponents) {
		// resolve and dispatch files with metadata
		const statsWithMetadata = await fileSystem.resolve(URI.from(cwd), {
			resolveMetadata: true,
		});
		if (statsWithMetadata.children) {
			dispatch(
				actions.updateStatsOfFiles({
					files: statsWithMetadata.children.map(mapFileStatToFile),
				}),
			);
		}
	}

	async function resolveDeep(targetToResolve: URI, targetStat: IFileStatWithMetadata) {
		const fileStatMap: FileStatMap = {};
		await resolveDeepRecursive(targetToResolve, targetStat, fileStatMap);
		return fileStatMap;
	}

	async function resolveDeepRecursive(
		targetToResolve: URI,
		targetStat: IFileStatWithMetadata,
		resultMap: FileStatMap,
	) {
		if (!targetStat.isDirectory) {
			resultMap[targetToResolve.toString()] = targetStat;
		} else if (targetStat.children && targetStat.children.length > 0) {
			// recursive resolve
			await Promise.all(
				targetStat.children.map(async (child) => {
					const childStat = await fileSystem.resolve(child.resource, { resolveMetadata: true });
					return resolveDeepRecursive(child.resource, childStat, resultMap);
				}),
			);
		}
	}

	async function changeDirectory(newDir: string) {
		const parsedUri = uriHelper.parseUri(ResourceScheme.FileSystem, newDir);

		// check if the directory is a valid directory (i.e., is a URI-parsable string)
		if (!parsedUri) {
			throw Error(
				`could not change directory, reason: path is not a valid directory. path: ${newDir}`,
			);
		}

		// if newDir is the current working directory, no action is necessary
		const cwdTrailingSepRemoved = resources.removeTrailingPathSeparator(URI.from(cwd));
		const parsedUriTrailingSepRemoved = resources.removeTrailingPathSeparator(parsedUri);

		if (resources.isEqual(cwdTrailingSepRemoved, parsedUriTrailingSepRemoved)) {
			return;
		}

		// check if the directory is a valid directory (i.e., the directory is accessible)
		const stats = await fileSystem.resolve(parsedUri);
		if (!stats.isDirectory) {
			throw Error(
				`could not change directory, reason: uri is not a valid directory. uri: ${parsedUri}`,
			);
		}

		// if newDir is not the current working directory, and is a valid directory => change to the new directory
		// first, dispatch files without metadata
		const newCmd = parsedUri.toJSON();
		const children = stats.children ?? [];
		dispatch(
			actions.changeCwd({
				newDir: newCmd,
				files: children.map(mapFileStatToFile),
			}),
		);

		// then, resolve and dispatch files with metadata
		return updateFilesOfCwd(newCmd);
	}

	return {
		changeDirectory,

		// since 'path' of the URI is currently used as ID, we can simply call changeDirectory, but before doing so we must
		// remove the leading slash (e.g., '/d:/TEMP' gets changed to 'd:/TEMP')
		changeDirectoryById: async (id: string) => changeDirectory(id.substring(1, id.length)),

		moveFilesToTrash: async (uris: URI[]) => {
			// move all files to trash (in parallel)
			await Promise.all(
				uris.map(async (uri) => {
					try {
						await fileSystem.del(uri, { useTrash: true, recursive: true });
					} catch (err) {
						logger.error(`could not move file to trash`, err);
					}
				}),
			);

			// update cwd content
			return updateFilesOfCwd(cwd);
		},

		openFile: async (uri: URI) => {
			const executablePath = uri.fsPath;

			const success = await shell.openPath(executablePath);
			if (!success) {
				logger.error(`electron shell openItem did not succeed for uri: ${uri}`);
			}
		},

		cutOrCopyFiles: (files: URI[], cut: boolean) =>
			dispatch(actions.cutOrCopyFiles({ files, cut })),

		pasteFiles: async () => {
			const targetFolder = URI.from(cwd);
			if (filesToPaste.length === 0) {
				return;
			}

			const targetFolderStat = await fileSystem.resolve(targetFolder);
			await Promise.all(
				filesToPaste.map(async (fileToPaste) => {
					const fileToPasteURI = URI.from(fileToPaste);
					// Check if target is ancestor of pasted folder
					if (
						targetFolder.toString() !== fileToPasteURI.toString() &&
						resources.isEqualOrParent(targetFolder, fileToPasteURI, !isLinux /* ignorecase */)
					) {
						throw new Error('File to paste is an ancestor of the destination folder');
					}

					let fileToPasteStat;
					try {
						fileToPasteStat = await fileSystem.resolve(fileToPasteURI, { resolveMetadata: true });
					} catch (err: unknown) {
						logger.error(
							'error during file paste process, file to paste was probably deleted or moved meanwhile',
							err,
						);
						return;
					}

					const fileStatMap = await resolveDeep(fileToPasteURI, fileToPasteStat);

					const pasteStatus: {
						id: string;
						totalSize: number;
						bytesProcessed: number;
						statusPerFile: {
							[uri: string]: {
								stat: IFileStatWithMetadata;
								bytesProcessed: number;
							};
						};
					} = {
						id: uuid.generateUuid(),
						totalSize: 0,
						bytesProcessed: 0,
						statusPerFile: {},
					};

					Object.entries(fileStatMap).forEach(([key, fileStat]) => {
						pasteStatus.totalSize += fileStat.size;
						pasteStatus.statusPerFile[key] = { stat: fileStat, bytesProcessed: 0 };
					});

					dispatch(
						actions.addPasteProcess({
							id: pasteStatus.id,
							totalSize: pasteStatus.totalSize,
						}),
					);

					const intervalId = setInterval(function dispatchProgress() {
						dispatch(
							actions.updatePasteProcess({
								id: pasteStatus.id,
								bytesProcessed: pasteStatus.bytesProcessed,
							}),
						);
					}, UPDATE_INTERVAL_MS);

					try {
						const targetFile = findValidPasteFileTarget(targetFolderStat, {
							resource: fileToPasteURI,
							isDirectory: fileToPasteStat.isDirectory,
							allowOverwrite: pasteShouldMove,
						});

						const progressCb = (newBytesRead: number, forSource: URI) => {
							pasteStatus.bytesProcessed += newBytesRead;
							pasteStatus.statusPerFile[forSource.toString()].bytesProcessed += newBytesRead;
						};

						// Move/Copy File
						const operation = pasteShouldMove
							? fileSystem.move(fileToPasteURI, targetFile, undefined, progressCb)
							: fileSystem.copy(fileToPasteURI, targetFile, undefined, progressCb);
						await operation;

						dispatch(actions.finishPasteProcess({ id: pasteStatus.id }));
					} finally {
						clearInterval(intervalId);
					}
				}),
			);

			if (pasteShouldMove) {
				// Cut is done
				dispatch(actions.resetPasteState());
			}

			// update cwd content
			return updateFilesOfCwd(cwd);
		},
	};
};

function findValidPasteFileTarget(
	targetFolder: IFileStat,
	fileToPaste: { resource: URI; isDirectory?: boolean; allowOverwrite: boolean },
): URI {
	let name = resources.basenameOrAuthority(fileToPaste.resource);
	let candidate = resources.joinPath(targetFolder.resource, name);

	if (fileToPaste.allowOverwrite || !targetFolder.children || targetFolder.children.length === 0) {
		return candidate;
	}

	const cmpFunction = (child: IFileStat) => child.resource.toString() === candidate.toString();

	while (true) {
		const conflict = targetFolder.children.find(cmpFunction);
		if (!conflict) {
			break;
		}

		name = incrementFileName(name, !!fileToPaste.isDirectory);
		candidate = resources.joinPath(targetFolder.resource, name);
	}

	return candidate;
}

function incrementFileName(name: string, isFolder: boolean): string {
	let namePrefix = name;
	let extSuffix = '';
	if (!isFolder) {
		extSuffix = extname(name);
		namePrefix = basename(name, extSuffix);
	}

	// name copy 5(.txt) => name copy 6(.txt)
	// name copy(.txt) => name copy 2(.txt)
	const suffixRegex = /^(.+ copy)( \d+)?$/;
	if (suffixRegex.test(namePrefix)) {
		return (
			namePrefix.replace(suffixRegex, (match, g1?, g2?) => {
				const number = g2 ? parseInt(g2) : 1;
				return number === 0
					? `${g1}`
					: number < Constants.MAX_SAFE_SMALL_INTEGER
					? `${g1} ${number + 1}`
					: `${g1}${g2} copy`;
			}) + extSuffix
		);
	}

	// name(.txt) => name copy(.txt)
	return `${namePrefix} copy${extSuffix}`;
}
