import { shell } from 'electron';

import * as resources from 'vs/base/common/resources';
import * as uuid from 'vs/base/common/uuid';
import { extname, basename } from 'vs/base/common/path';
import { URI } from 'vs/base/common/uri';
import { isLinux } from 'vs/base/common/platform';
import { Constants } from 'vs/base/common/uint';
import { IFileStat, IFileStatWithMetadata } from 'vs/platform/files/common/files';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { createLogger } from 'vs/nex/base/logger/logger';
import { ResourceScheme } from 'vs/nex/platform/file-types';
import { mapFileStatToFile, NexFileSystem } from 'vs/nex/platform/logic/file-system';
import {
	actions as fileProviderActions,
	FileProviderState,
} from 'vs/nex/platform/store/file-provider/file-provider.slice';
import { AppDispatch } from 'vs/nex/platform/store/store';

const UPDATE_INTERVAL_MS = 300;
const logger = createLogger('file-provider.operations');

type FileStatMap = {
	[uri: string]: IFileStatWithMetadata;
};

export function createThunks(
	getFileProviderState: () => FileProviderState,
	dispatch: AppDispatch,
	fileSystem: NexFileSystem,
) {
	async function updateFilesOfCwd() {
		// resolve and dispatch files with metadata
		const statsWithMetadata = await fileSystem.resolve(URI.from(getFileProviderState().cwd), {
			resolveMetadata: true,
		});
		if (statsWithMetadata.children) {
			dispatch(
				fileProviderActions.updateStatsOfFiles({
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
		const { cwd } = getFileProviderState();

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
		const children = stats.children ?? [];
		dispatch(
			fileProviderActions.changeCwd({
				newDir: parsedUri.toJSON(),
				files: children.map(mapFileStatToFile),
			}),
		);

		// then, resolve and dispatch files with metadata
		return updateFilesOfCwd();
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
			return updateFilesOfCwd();
		},

		openFile: async (uri: URI) => {
			const executablePath = uri.fsPath;

			const success = await shell.openPath(executablePath);
			if (!success) {
				logger.error(`electron shell openItem did not succeed for uri: ${uri}`);
			}
		},

		cutOrCopyFiles: (files: URI[], cut: boolean) =>
			dispatch(fileProviderActions.cutOrCopyFiles({ files, cut })),

		pasteFiles: async () => {
			const { cwd, filesToPaste, pasteShouldMove } = getFileProviderState();
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
						fileProviderActions.addPasteProcess({
							id: pasteStatus.id,
							totalSize: pasteStatus.totalSize,
						}),
					);

					const intervalId = setInterval(function dispatchProgress() {
						dispatch(
							fileProviderActions.updatePasteProcess({
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

						dispatch(fileProviderActions.finishPasteProcess({ id: pasteStatus.id }));
					} finally {
						clearInterval(intervalId);
					}
				}),
			);

			if (pasteShouldMove) {
				// Cut is done
				dispatch(fileProviderActions.resetPasteState());
			}

			// update cwd content
			return updateFilesOfCwd();
		},
	};
}

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
