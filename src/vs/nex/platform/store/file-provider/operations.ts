import { shell } from 'electron';

import * as resources from 'vs/base/common/resources';
import * as uuid from 'vs/base/common/uuid';
import { extname, basename } from 'vs/base/common/path';
import { URI } from 'vs/base/common/uri';
import { isLinux } from 'vs/base/common/platform';
import { Constants } from 'vs/base/common/uint';
import { IFileStat, IFileStatWithMetadata } from 'vs/platform/files/common/files';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { logger } from 'vs/nex/base/logger/logger';
import { ResourceScheme, FileProviderState } from 'vs/nex/platform/file-types';
import { NexFileSystem } from 'vs/nex/platform/logic/file-system';
import {
	changeCwd,
	updateStatsOfFiles,
	cutOrCopyFiles,
	resetPasteState,
	addPasteProcess,
	updatePasteProcess,
	finishPasteProcess,
} from 'vs/nex/platform/store/file-provider/actions';
import { DispatchType } from 'vs/nex/platform/store/store';

const UPDATE_INTERVAL_MS = 300;

function findValidPasteFileTarget(targetFolder: IFileStat, fileToPaste: { resource: URI; isDirectory?: boolean; allowOverwrite: boolean }): URI {
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
		return namePrefix.replace(suffixRegex, (match, g1?, g2?) => {
			const number = (g2 ? parseInt(g2) : 1);
			return number === 0
				? `${g1}`
				: (number < Constants.MAX_SAFE_SMALL_INTEGER
					? `${g1} ${number + 1}`
					: `${g1}${g2} copy`);
		}) + extSuffix;
	}

	// name(.txt) => name copy(.txt)
	return `${namePrefix} copy${extSuffix}`;
}

interface FileStatMap {
	[uri: string]: IFileStatWithMetadata;
}

function createActions(getFileProviderState: () => FileProviderState, dispatch: DispatchType, fileSystem: NexFileSystem) {

	async function updateFilesOfCwd() {
		// resolve and dispatch files with metadata
		const statsWithMetadata = await fileSystem.resolve(getFileProviderState().cwd, { resolveMetadata: true });
		if (statsWithMetadata.children) {
			dispatch(updateStatsOfFiles(statsWithMetadata.children));
		}
	}

	async function resolveDeep(targetToResolve: URI, targetStat: IFileStatWithMetadata) {
		const fileStatMap: FileStatMap = {};
		await resolveDeepRecursive(targetToResolve, targetStat, fileStatMap);
		return fileStatMap;
	}

	async function resolveDeepRecursive(targetToResolve: URI, targetStat: IFileStatWithMetadata, resultMap: FileStatMap) {
		if (!targetStat.isDirectory) {
			resultMap[targetToResolve.toString()] = targetStat;
		} else if (targetStat.children && targetStat.children.length > 0) {
			// recursive resolve
			await Promise.all(targetStat.children.map(async child => {
				const childStat = await fileSystem.resolve(child.resource, { resolveMetadata: true });
				return resolveDeepRecursive(child.resource, childStat, resultMap);
			}));
		}
	}

	const actions = {
		changeDirectory: async (newDir: string) => {

			const parsedUri = uriHelper.parseUri(ResourceScheme.FileSystem, newDir);

			// check if the directory is a valid directory (i.e., is a URI-parsable string)
			if (!parsedUri) {
				throw Error(`could not change directory, reason: path is not a valid directory. path: ${newDir}`);
			}

			// if newDir is the current working directory, no action is necessary
			const { cwd } = getFileProviderState();

			const cwdTrailingSepRemoved = resources.removeTrailingPathSeparator(cwd);
			const parsedUriTrailingSepRemoved = resources.removeTrailingPathSeparator(parsedUri);

			if (resources.isEqual(cwdTrailingSepRemoved, parsedUriTrailingSepRemoved)) {
				return;
			}

			// check if the directory is a valid directory (i.e., the directory is accessible)
			const stats = await fileSystem.resolve(parsedUri);
			if (!stats.isDirectory) {
				throw Error(`could not change directory, reason: uri is not a valid directory. uri: ${parsedUri}`);
			}

			// if newDir is not the current working directory, and is a valid directory => change to the new directory

			// dispatch files without metadata
			dispatch(changeCwd(parsedUri, stats.children));

			// resolve and dispatch files with metadata
			return updateFilesOfCwd();
		},

		// since 'path' of the URI is currently used as ID, we can simply call changeDirectory, but before doing so we must
		// remove the leading slash (e.g., '/d:/TEMP' gets changed to 'd:/TEMP')
		changeDirectoryById: async (id: string) => actions.changeDirectory(id.substring(1, id.length)),

		moveFilesToTrash: async (uris: URI[]) => {

			// move all files to trash (in parallel)
			await Promise.all(uris.map(async uri => {
				try {
					await fileSystem.del(uri, { useTrash: true, recursive: true });
				} catch (err) {
					logger.error(`could not move file to trash, error: ${err.toString()}`);
				}
			}));

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

		cutOrCopyFiles: (files: URI[], cut: boolean) => dispatch(cutOrCopyFiles(files, cut)),

		pasteFiles: async () => {
			const { cwd: targetFolder, filesToPaste, pasteShouldMove } = getFileProviderState();
			if (filesToPaste.length === 0) {
				return;
			}

			const targetFolderStat = await fileSystem.resolve(targetFolder);
			await Promise.all(filesToPaste.map(async fileToPaste => {

				// Check if target is ancestor of pasted folder
				if (targetFolder.toString() !== fileToPaste.toString() && resources.isEqualOrParent(targetFolder, fileToPaste, !isLinux /* ignorecase */)) {
					throw new Error('File to paste is an ancestor of the destination folder');
				}

				let fileToPasteStat;
				try {
					fileToPasteStat = await fileSystem.resolve(fileToPaste, { resolveMetadata: true });
				} catch {
					logger.error('File to paste was deleted or moved meanwhile');
					return;
				}

				const fileStatMap = await resolveDeep(fileToPaste, fileToPasteStat);

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

				Object.entries(fileStatMap).forEach(entry => {
					const [key, fileStat] = entry;
					pasteStatus.totalSize += fileStat.size;
					pasteStatus.statusPerFile[key] = { stat: fileStat, bytesProcessed: 0 };
				});

				dispatch(addPasteProcess(pasteStatus.id, pasteStatus.totalSize));

				const intervalId = setInterval(function dispatchProgress() {
					dispatch(updatePasteProcess(pasteStatus.id, pasteStatus.bytesProcessed));
				}, UPDATE_INTERVAL_MS);

				try {
					const targetFile = findValidPasteFileTarget(targetFolderStat, { resource: fileToPaste, isDirectory: fileToPasteStat.isDirectory, allowOverwrite: pasteShouldMove });

					const progressCb = (newBytesRead: number, forSource: URI) => {
						pasteStatus.bytesProcessed += newBytesRead;
						pasteStatus.statusPerFile[forSource.toString()].bytesProcessed += newBytesRead;
					};

					// Move/Copy File
					const operation = pasteShouldMove
						? fileSystem.move(fileToPaste, targetFile, undefined, progressCb)
						: fileSystem.copy(fileToPaste, targetFile, undefined, progressCb);
					await operation;

					dispatch(finishPasteProcess(pasteStatus.id));
				} finally {
					clearInterval(intervalId);
				}
			}));

			if (pasteShouldMove) {
				// Cut is done
				dispatch(resetPasteState());
			}

			// update cwd content
			return updateFilesOfCwd();
		},
	};

	return actions;
}

export default createActions;
