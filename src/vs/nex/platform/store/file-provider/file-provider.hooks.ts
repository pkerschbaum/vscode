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
import { useClipboardResources, useNexClipboard } from 'vs/nex/ui/NexClipboard.provider';
import { useDispatch, useSelector } from 'vs/nex/platform/store/store';
import {
	File,
	FILE_TYPE,
	RESOURCES_SCHEME,
	FileStatMap,
	PASTE_STATUS,
	PasteProcess,
} from 'vs/nex/platform/file-types';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { createLogger } from 'vs/nex/base/logger/logger';
import { CustomError } from 'vs/nex/base/custom-error';
import { objects } from 'vs/nex/base/utils/objects.util';

export type FileForUI = File & {
	name: string;
	extension?: string;
	iconClasses: string[];
};

const UPDATE_INTERVAL_MS = 300;
const logger = createLogger('file-provider.hooks');

export function useFileProviderState() {
	const modelService = useModelService();
	const modeService = useModeService();

	return useSelector((state) => ({
		...state.fileProvider,
		pasteProcesses: state.fileProvider.pasteProcesses.map((process) => ({
			...process,
			bytesProcessed:
				process.status === PASTE_STATUS.FINISHED ? process.totalSize : process.bytesProcessed,
		})),
		files: Object.values(state.fileProvider.files)
			.filter(objects.isNotNullish)
			.map((file) => {
				const baseName = extractBaseName(file.uri.path);
				const { fileName, extension } = extractNameAndExtension(baseName, file.fileType);
				const fileType = mapFileTypeToFileKind(file.fileType);

				const iconClasses = getIconClasses(modelService, modeService, URI.from(file.uri), fileType);

				const fileForUI: FileForUI = {
					id: file.id,
					uri: file.uri,
					fileType: file.fileType,
					extension,
					iconClasses,
					name: fileName,
					size: file.size,
					lastChangedAt: file.lastChangedAt,
				};
				return fileForUI;
			}),
	}));
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
	fileType: FILE_TYPE,
): { fileName: string; extension?: string } {
	let fileName;
	let extension;

	if (fileType === FILE_TYPE.DIRECTORY) {
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

function mapFileTypeToFileKind(fileType: FILE_TYPE) {
	if (fileType === FILE_TYPE.FILE) {
		return FileKind.FILE;
	} else if (fileType === FILE_TYPE.DIRECTORY) {
		return FileKind.FOLDER;
	} else {
		return undefined;
	}
}

export const useFileProviderThunks = () => {
	const fileSystem = useNexFileSystem();
	const dispatch = useDispatch();
	const { cwd, draftPasteState } = useFileProviderState();
	const clipboard = useNexClipboard();
	const clipboardResources = useClipboardResources();

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

	async function resolveDeep(targetToResolve: UriComponents, targetStat: IFileStatWithMetadata) {
		const fileStatMap: FileStatMap = {};
		await resolveDeepRecursive(targetToResolve, targetStat, fileStatMap);
		return fileStatMap;
	}

	async function resolveDeepRecursive(
		targetToResolve: UriComponents,
		targetStat: IFileStatWithMetadata,
		resultMap: FileStatMap,
	) {
		if (!targetStat.isDirectory) {
			resultMap[URI.from(targetToResolve).toString()] = targetStat;
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
		const parsedUri = uriHelper.parseUri(RESOURCES_SCHEME.FILE_SYSTEM, newDir);

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

		moveFilesToTrash: async (uris: UriComponents[]) => {
			// move all files to trash (in parallel)
			await Promise.all(
				uris.map(async (uri) => {
					try {
						await fileSystem.del(URI.from(uri), { useTrash: true, recursive: true });
					} catch (err) {
						logger.error(`could not move file to trash`, err);
					}
				}),
			);

			// update cwd content
			return updateFilesOfCwd(cwd);
		},

		openFile: async (uri: UriComponents) => {
			const executablePath = URI.from(uri).fsPath;

			const success = await shell.openPath(executablePath);
			if (!success) {
				logger.error(`electron shell openItem did not succeed`, undefined, { uri });
			}
		},

		cutOrCopyFiles: async (files: UriComponents[], cut: boolean) => {
			await clipboard.writeResources(files.map((file) => URI.from(file)));
			dispatch(actions.cutOrCopyFiles({ cut }));
		},

		pasteFiles: async () => {
			if (clipboardResources.length === 0 || draftPasteState === undefined) {
				return;
			}

			const destinationFolder = URI.from(cwd);
			const targetFolderStat = await fileSystem.resolve(destinationFolder);

			// clear draft paste state (neither cut&paste nor copy&paste is designed to be repeatable)
			dispatch(actions.clearDraftPasteState());

			await Promise.all(
				clipboardResources.map(async (sourceFile) => {
					const sourceFileURI = URI.from(sourceFile);

					// Destination folder must not be a subfolder of any source file/folder. Imagine copying
					// a folder "test" and paste it (and its content) *into* itself, that would not work.
					if (
						destinationFolder.toString() !== sourceFileURI.toString() &&
						resources.isEqualOrParent(destinationFolder, sourceFileURI, !isLinux /* ignorecase */)
					) {
						throw new CustomError('The destination folder is a subfolder of the source file', {
							destinationFolder,
							sourceFile,
						});
					}

					let sourceFileStat;
					try {
						sourceFileStat = await fileSystem.resolve(sourceFileURI, { resolveMetadata: true });
					} catch (err: unknown) {
						logger.error(
							'error during file paste process, source file was probably deleted or moved meanwhile',
							err,
						);
						return;
					}

					const fileStatMap = await resolveDeep(sourceFileURI, sourceFileStat);

					const pasteStatus: Omit<PasteProcess, 'status'> = {
						id: uuid.generateUuid(),
						totalSize: 0,
						bytesProcessed: 0,
						destinationFolder: destinationFolder.toJSON(),
					};
					const statusPerFile: {
						[uri: string]: { bytesProcessed: number };
					} = {};

					Object.entries(fileStatMap).forEach(([uri, fileStat]) => {
						pasteStatus.totalSize += fileStat.size;
						statusPerFile[uri] = { bytesProcessed: 0 };
					});

					dispatch(actions.addPasteProcess(objects.deepCopyJson(pasteStatus)));

					const intervalId = setInterval(function dispatchProgress() {
						dispatch(
							actions.updatePasteProcess({
								id: pasteStatus.id,
								bytesProcessed: pasteStatus.bytesProcessed,
							}),
						);
					}, UPDATE_INTERVAL_MS);

					try {
						const targetFileURI = findValidPasteFileTarget(targetFolderStat, {
							resource: sourceFileURI,
							isDirectory: sourceFileStat.isDirectory,
							allowOverwrite: draftPasteState.pasteShouldMove,
						});

						const progressCb = (newBytesRead: number, forSource: URI) => {
							pasteStatus.bytesProcessed += newBytesRead;
							statusPerFile[forSource.toString()].bytesProcessed += newBytesRead;
						};

						// Move/Copy File
						const operation = draftPasteState.pasteShouldMove
							? fileSystem.move(sourceFileURI, targetFileURI, undefined, progressCb)
							: fileSystem.copy(sourceFileURI, targetFileURI, undefined, progressCb);
						await operation;

						dispatch(actions.finishPasteProcess({ id: pasteStatus.id }));
					} finally {
						clearInterval(intervalId);
					}
				}),
			);

			// update cwd content
			return updateFilesOfCwd(cwd);
		},
	};
};

function findValidPasteFileTarget(
	targetFolder: IFileStat,
	fileToPaste: { resource: UriComponents; isDirectory?: boolean; allowOverwrite: boolean },
): URI {
	let name = resources.basenameOrAuthority(URI.from(fileToPaste.resource));
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
