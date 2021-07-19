import * as resources from 'vs/base/common/resources';
import * as uuid from 'vs/base/common/uuid';
import { extname, basename } from 'vs/base/common/path';
import { Constants } from 'vs/base/common/uint';
import { isLinux } from 'vs/base/common/platform';
import { URI, UriComponents } from 'vs/base/common/uri';
import { CancellationTokenSource } from 'vs/base/common/cancellation';
import { IFileStat } from 'vs/platform/files/common/files';

import { actions } from 'vs/nex/platform/store/file-provider/file-provider.slice';
import { useNexFileSystem } from 'vs/nex/NexFileSystem.provider';
import { useClipboardResources } from 'vs/nex/NexClipboard.provider';
import { useDispatch } from 'vs/nex/platform/store/store';
import { PROCESS_STATUS, PROCESS_TYPE, RESOURCES_SCHEME } from 'vs/nex/platform/file-types';
import { createLogger } from 'vs/nex/base/logger/logger';
import { CustomError } from 'vs/nex/base/custom-error';
import {
	useFileProviderCwd,
	useFileProviderDraftPasteState,
	useInvalidateFiles,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useFileActions, executeCopyOrMove } from 'vs/nex/platform/file.hooks';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { objects } from 'vs/nex/base/utils/objects.util';

const UPDATE_INTERVAL_MS = 300;
const logger = createLogger('explorer.hooks');

export function useExplorerActions(explorerId: string) {
	const dispatch = useDispatch();
	const cwd = useFileProviderCwd(explorerId);
	const draftPasteState = useFileProviderDraftPasteState();

	const fileSystem = useNexFileSystem();
	const clipboardResources = useClipboardResources();

	const invalidateFiles = useInvalidateFiles();
	const fileActions = useFileActions();

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
		const newCwd = parsedUri.toJSON();
		dispatch(actions.changeCwd({ explorerId, newCwd }));
	}

	async function pasteFiles() {
		if (clipboardResources.length === 0 || draftPasteState === undefined) {
			return;
		}

		const destinationFolder = URI.from(cwd);
		const destinationFolderStat = await fileSystem.resolve(destinationFolder);

		// clear draft paste state (neither cut&paste nor copy&paste is designed to be repeatable)
		dispatch(actions.clearDraftPasteState());

		// for each file/folder to paste, check for some required conditions and prepare target URI
		const pasteInfos = (
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

					const targetFileURI = findValidPasteFileTarget(destinationFolderStat, {
						resource: sourceFileURI,
						isDirectory: sourceFileStat.isDirectory,
						allowOverwrite: false,
					});

					return { sourceFileURI, sourceFileStat, targetFileURI };
				}),
			)
		).filter(objects.isNotNullish);

		// after target URI got prepared, initialize paste status fields and gather totalSize
		const id = uuid.generateUuid();
		let totalSize = 0;
		let bytesProcessed = 0;
		let cancellationTokenSource = new CancellationTokenSource();
		const statusPerFile: {
			[uri: string]: { bytesProcessed: number };
		} = {};

		await Promise.all(
			pasteInfos.map(async (pasteInfo) => {
				const { sourceFileURI, sourceFileStat } = pasteInfo;

				const fileStatMap = await fileActions.resolveDeep(sourceFileURI, sourceFileStat);

				Object.entries(fileStatMap).forEach(([uri, fileStat]) => {
					totalSize += fileStat.size;
					statusPerFile[uri] = { bytesProcessed: 0 };
				});
			}),
		);

		// dispatch infos about the paste process about to start
		dispatch(
			actions.addPasteProcess({
				type: PROCESS_TYPE.PASTE,
				id,
				totalSize,
				bytesProcessed,
				destinationFolder: destinationFolder.toJSON(),
				cancellationTokenSource,
			}),
		);

		// perform paste
		let errorOccured = false;
		function progressCb(newBytesRead: number, forSource: URI) {
			bytesProcessed += newBytesRead;
			statusPerFile[forSource.toString()].bytesProcessed += newBytesRead;
		}
		const intervalId = setInterval(function dispatchProgress() {
			dispatch(actions.updatePasteProcess({ id, bytesProcessed }));
		}, UPDATE_INTERVAL_MS);

		try {
			cancellationTokenSource.token.onCancellationRequested(() => clearInterval(intervalId));

			await Promise.all(
				pasteInfos.map((pasteInfo) =>
					executeCopyOrMove({
						...pasteInfo,
						pasteShouldMove: draftPasteState.pasteShouldMove,
						cancellationTokenSource,
						progressCb,
						fileTagActions: fileActions,
						fileSystem,
					}),
				),
			);

			dispatch(actions.updatePasteProcess({ id, status: PROCESS_STATUS.SUCCESS }));
		} catch (err) {
			errorOccured = true;
			dispatch(actions.updatePasteProcess({ id, status: PROCESS_STATUS.FAILURE }));
		} finally {
			clearInterval(intervalId);
			cancellationTokenSource.dispose();
		}

		/*
		 * If an error occured or cancellation was requested, perform cleanup.
		 * We can just permanently delete all target file URIs (and, if it's a folder, its contents),
		 * since "findValidPasteFileTarget" makes sure that the paste target URIs are new, without conflict.
		 */
		const cleanupNecessary = errorOccured || cancellationTokenSource.token.isCancellationRequested;
		if (cleanupNecessary) {
			await Promise.all(
				pasteInfos.map(async (pasteInfo) => {
					const { targetFileURI } = pasteInfo;
					try {
						await fileSystem.del(targetFileURI, { useTrash: false, recursive: true });
					} catch {
						// ignore
					}
				}),
			);
		}

		// invalidate files of the target directory
		await invalidateFiles(cwd);
	}

	async function createFolder(folderName: string) {
		// create folder
		const folderUri = URI.joinPath(URI.from(cwd), folderName);
		await fileSystem.createFolder(folderUri);

		// invalidate files of the target directory
		await invalidateFiles(cwd);
	}

	return {
		changeDirectory,
		pasteFiles,
		createFolder,
	};
}

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
			namePrefix.replace(suffixRegex, (_, g1?, g2?) => {
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
