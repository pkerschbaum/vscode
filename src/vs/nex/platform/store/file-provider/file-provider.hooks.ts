import * as React from 'react';
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
import { useNexStorage } from 'vs/nex/ui/NexStorage.provider';
import { useDispatch, useSelector } from 'vs/nex/platform/store/store';
import {
	File,
	FILE_TYPE,
	RESOURCES_SCHEME,
	FileStatMap,
	PASTE_STATUS,
	PasteProcess,
	Tag,
} from 'vs/nex/platform/file-types';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { createLogger } from 'vs/nex/base/logger/logger';
import { CustomError } from 'vs/nex/base/custom-error';
import { objects } from 'vs/nex/base/utils/objects.util';
import { STORAGE_KEY } from 'vs/nex/platform/logic/storage';
import { useTagsActions } from 'vs/nex/platform/tags.hooks';
import { useRerenderOnEventFire } from 'vs/nex/platform/store/util/hooks.util';
import { arrays } from 'vs/nex/base/utils/arrays.util';

export type FileForUI = File & {
	name: string;
	extension?: string;
	tags: Tag[];
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
					tags: [],
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
	const dispatch = useDispatch();
	const { cwd, draftPasteState } = useFileProviderState();
	const fileSystem = useNexFileSystem();
	const clipboard = useNexClipboard();
	const clipboardResources = useClipboardResources();
	const storage = useNexStorage();
	const tagsActions = useTagsActions();

	useRerenderOnEventFire(
		storage.onDataChanged,
		React.useCallback((storageKey) => storageKey === STORAGE_KEY.RESOURCES_TO_TAGS, []),
	);

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

	const addTags = (files: UriComponents[], tagIds: string[]) => {
		logger.debug(`adding tags to files...`, { files, tagIds });

		const existingTagIds = Object.keys(tagsActions.getTags());
		const invalidTagIds = tagIds.filter(
			(tagId) => !existingTagIds.find((existing) => existing === tagId),
		);
		if (invalidTagIds.length > 0) {
			throw new CustomError(
				`at least one tag which should be added is not present in the storage`,
				{ invalidTagIds },
			);
		}

		const fileToTagsMap = storage.get(STORAGE_KEY.RESOURCES_TO_TAGS) ?? {};

		for (const file of files) {
			const existingTagsOfFile = fileToTagsMap[URI.from(file).toString()] ?? [];
			fileToTagsMap[URI.from(file).toString()] = [...existingTagsOfFile, ...tagIds];
		}

		storage.store(STORAGE_KEY.RESOURCES_TO_TAGS, fileToTagsMap);

		logger.debug(`tags to files added and stored in storage!`);
	};

	const getTagsOfFile = (file: UriComponents): Tag[] => {
		const tagIdsOfFile = storage.get(STORAGE_KEY.RESOURCES_TO_TAGS)?.[URI.from(file).toString()];

		if (tagIdsOfFile === undefined || tagIdsOfFile.length === 0) {
			return [];
		}

		const tags = tagsActions.getTags();
		const tagsOfFile = Object.entries(tags)
			.map(([id, otherValues]) => ({ ...otherValues, id }))
			.filter((tag) => tagIdsOfFile.some((tagId) => tagId === tag.id));

		logger.debug(`got tags of file from storage`, { file, tagsOfFile });

		return tagsOfFile;
	};

	const removeTags = (files: UriComponents[], tagIds: string[]) => {
		logger.debug(`removing tags from files...`, { files, tagIds });

		const fileToTagsMap = storage.get(STORAGE_KEY.RESOURCES_TO_TAGS);

		if (fileToTagsMap === undefined) {
			logger.debug(`tags from files removed (no tags were present at all)`);
			return;
		}

		for (const file of files) {
			const existingTagsOfFile = fileToTagsMap[URI.from(file).toString()];
			if (existingTagsOfFile !== undefined) {
				fileToTagsMap[URI.from(file).toString()] = existingTagsOfFile.filter(
					(existingTagId) => !tagIds.some((tagIdToRemove) => tagIdToRemove === existingTagId),
				);
			}
		}

		storage.store(STORAGE_KEY.RESOURCES_TO_TAGS, fileToTagsMap);

		logger.debug(
			`tags from files removed! Deleting those tags now which are not ` +
				`associated with at least one file anymore...`,
		);

		const usedTagIds = arrays.uniqueValues(
			arrays.flatten(Object.values(fileToTagsMap).filter(objects.isNotNullish)),
		);
		const tagIdsToDelete = tagIds.filter(
			(tagId) => !usedTagIds.some((usedTagId) => usedTagId === tagId),
		);
		if (tagIdsToDelete.length > 0) {
			logger.debug(`deleting tags...`, { tagIdsToDelete });
			tagsActions.removeTags(tagIdsToDelete);
		} else {
			logger.debug(`no tags to delete`);
		}
	};

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

						// Also copy tags to destination
						const tagsOfSourceFile = getTagsOfFile(sourceFileURI).map((t) => t.id);
						addTags([targetFileURI], tagsOfSourceFile);

						// If move operation was performed, remove tags from source URI
						if (draftPasteState.pasteShouldMove) {
							removeTags([sourceFileURI], tagsOfSourceFile);
						}

						dispatch(actions.finishPasteProcess({ id: pasteStatus.id }));
					} finally {
						clearInterval(intervalId);
					}
				}),
			);

			// update cwd content
			return updateFilesOfCwd(cwd);
		},

		addTags,
		getTagsOfFile,
		removeTags,
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
