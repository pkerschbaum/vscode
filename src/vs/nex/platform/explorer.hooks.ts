import * as resources from 'vs/base/common/resources';
import * as uuid from 'vs/base/common/uuid';
import { extname, basename } from 'vs/base/common/path';
import type { ProgressCbArgs } from 'vs/base/common/resources';
import { Constants } from 'vs/base/common/uint';
import { isLinux } from 'vs/base/common/platform';
import { URI, UriComponents } from 'vs/base/common/uri';
import { CancellationTokenSource } from 'vs/base/common/cancellation';
import { IFileStat } from 'vs/platform/files/common/files';

import { actions } from 'vs/nex/platform/store/file-provider/file-provider.slice';
import { useNexFileSystem } from 'vs/nex/NexFileSystem.context';
import { useClipboardResources } from 'vs/nex/NexClipboard.context';
import { useDispatch } from 'vs/nex/platform/store/store';
import { PROCESS_STATUS, PROCESS_TYPE, RESOURCES_SCHEME } from 'vs/nex/platform/file-types';
import { createLogger } from 'vs/nex/base/logger/logger';
import { CustomError } from 'vs/nex/base/custom-error';
import {
	useFileProviderCwd,
	useFileProviderDraftPasteState,
	useRefreshFiles,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import {
	executeCopyOrMove,
	useAddTags,
	useGetTagsOfFile,
	useRemoveTags,
	useResolveDeep,
} from 'vs/nex/platform/file.hooks';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { objects } from 'vs/nex/base/utils/objects.util';

const UPDATE_INTERVAL_MS = 300;
const logger = createLogger('explorer.hooks');

export function useChangeDirectory(explorerId: string) {
	const dispatch = useDispatch();
	const cwd = useFileProviderCwd(explorerId);

	const fileSystem = useNexFileSystem();

	const refreshFiles = useRefreshFiles();

	async function changeDirectory(newDir: string) {
		const parsedUri = uriHelper.parseUri(RESOURCES_SCHEME.FILE_SYSTEM, newDir);

		// check if the directory is a valid directory (i.e., is a URI-parsable string, and the directory is accessible)
		if (!parsedUri) {
			throw Error(
				`could not change directory, reason: path is not a valid directory. path: ${newDir}`,
			);
		}
		const stats = await fileSystem.resolve(parsedUri);
		if (!stats.isDirectory) {
			throw Error(
				`could not change directory, reason: uri is not a valid directory. uri: ${parsedUri}`,
			);
		}

		// change to the new directory and reload files
		const newCwd = parsedUri.toJSON();
		dispatch(actions.changeCwd({ explorerId, newCwd }));
		await refreshFiles(cwd);
	}

	return {
		changeDirectory,
	};
}

export function usePasteFiles(explorerId: string) {
	const dispatch = useDispatch();
	const cwd = useFileProviderCwd(explorerId);
	const draftPasteState = useFileProviderDraftPasteState();

	const fileSystem = useNexFileSystem();
	const clipboardResources = useClipboardResources();

	const refreshFiles = useRefreshFiles();
	const { resolveDeep } = useResolveDeep();
	const { getTagsOfFile } = useGetTagsOfFile();
	const { addTags } = useAddTags();
	const { removeTags } = useRemoveTags();

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
				clipboardResources.map(async (sourceFileURI) => {
					// Destination folder must not be a subfolder of any source file/folder. Imagine copying
					// a folder "test" and paste it (and its content) *into* itself, that would not work.
					if (
						destinationFolder.toString() !== sourceFileURI.toString() &&
						resources.isEqualOrParent(destinationFolder, sourceFileURI, !isLinux /* ignorecase */)
					) {
						throw new CustomError('The destination folder is a subfolder of the source file', {
							destinationFolder,
							sourceFileURI,
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
		let progressOfAtLeastOneSourceIsIndeterminate = false;
		let cancellationTokenSource = new CancellationTokenSource();
		const statusPerFile: {
			[uri: string]: { bytesProcessed: number };
		} = {};

		await Promise.all(
			pasteInfos.map(async (pasteInfo) => {
				const { sourceFileURI, sourceFileStat } = pasteInfo;

				const fileStatMap = await resolveDeep(sourceFileURI, sourceFileStat);

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
				sourceUris: clipboardResources.map((resource) => resource.toJSON()),
				id,
				totalSize,
				bytesProcessed,
				progressOfAtLeastOneSourceIsIndeterminate,
				destinationFolder: destinationFolder.toJSON(),
				cancellationTokenSource,
			}),
		);

		// perform paste
		function progressCb(progressArgs: ProgressCbArgs) {
			if ('newBytesRead' in progressArgs && progressArgs.newBytesRead !== undefined) {
				bytesProcessed += progressArgs.newBytesRead;
				statusPerFile[progressArgs.forSource.toString()].bytesProcessed +=
					progressArgs.newBytesRead;
			}
			if ('progressIsIndeterminate' in progressArgs && progressArgs.progressIsIndeterminate) {
				progressOfAtLeastOneSourceIsIndeterminate = true;
			}
		}
		const intervalId = setInterval(function dispatchProgress() {
			dispatch(
				actions.updatePasteProcess({
					id,
					bytesProcessed,
					progressOfAtLeastOneSourceIsIndeterminate,
				}),
			);
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
						fileTagActions: { getTagsOfFile, addTags, removeTags },
						fileSystem,
						refreshFiles,
					}),
				),
			);

			dispatch(actions.updatePasteProcess({ id, status: PROCESS_STATUS.SUCCESS }));
		} catch (err: unknown) {
			dispatch(
				actions.updatePasteProcess({
					id,
					status: PROCESS_STATUS.FAILURE,
					error: err instanceof Error ? err.message : `Unknown error occured`,
				}),
			);
		} finally {
			clearInterval(intervalId);
			cancellationTokenSource.dispose();
		}
	}

	return {
		pasteFiles,
	};
}

export function useCreateFolder(explorerId: string) {
	const cwd = useFileProviderCwd(explorerId);

	const fileSystem = useNexFileSystem();

	const refreshFiles = useRefreshFiles();

	async function createFolder(folderName: string) {
		// create folder
		const folderUri = URI.joinPath(URI.from(cwd), folderName);
		await fileSystem.createFolder(folderUri);

		// invalidate files of the target directory
		await refreshFiles(cwd);
	}

	return {
		createFolder,
	};
}

export function useRevealCwdInOSExplorer(explorerId: string) {
	const cwd = useFileProviderCwd(explorerId);

	const fileSystem = useNexFileSystem();

	function revealCwdInOSExplorer() {
		fileSystem.revealResourcesInOS([cwd]);
	}

	return {
		revealCwdInOSExplorer,
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
