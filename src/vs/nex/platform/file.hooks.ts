import * as React from 'react';
import { shell } from 'electron';

import * as resources from 'vs/base/common/resources';
import * as uuid from 'vs/base/common/uuid';
import { extname, basename } from 'vs/base/common/path';
import { Constants } from 'vs/base/common/uint';
import { isLinux } from 'vs/base/common/platform';
import { URI, UriComponents } from 'vs/base/common/uri';
import { IFileStat, IFileStatWithMetadata } from 'vs/platform/files/common/files';

import { actions } from 'vs/nex/platform/store/file-provider/file-provider.slice';
import { useNexFileSystem } from 'vs/nex/NexFileSystem.provider';
import { useClipboardResources, useNexClipboard } from 'vs/nex/NexClipboard.provider';
import { useNexStorage } from 'vs/nex/NexStorage.provider';
import { useDispatch } from 'vs/nex/platform/store/store';
import { File, FileStatMap, PasteProcess, Tag } from 'vs/nex/platform/file-types';
import { createLogger } from 'vs/nex/base/logger/logger';
import { CustomError } from 'vs/nex/base/custom-error';
import { objects } from 'vs/nex/base/utils/objects.util';
import { STORAGE_KEY } from 'vs/nex/platform/logic/storage';
import { useFileProviderState } from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useTagsActions } from 'vs/nex/platform/tag.hooks';
import { useRerenderOnEventFire } from 'vs/nex/platform/store/util/hooks.util';
import { useNavigationActions } from 'vs/nex/platform/navigation.hooks';

export type FileForUI = File & {
	name: string;
	extension?: string;
	tags: Tag[];
	iconClasses: string[];
};

const UPDATE_INTERVAL_MS = 300;
const logger = createLogger('file.hooks');

export function useFileActions() {
	const dispatch = useDispatch();
	const { cwd, draftPasteState } = useFileProviderState();

	const fileSystem = useNexFileSystem();
	const clipboard = useNexClipboard();
	const clipboardResources = useClipboardResources();
	const storage = useNexStorage();

	const tagsActions = useTagsActions();
	const navigationActions = useNavigationActions();

	useRerenderOnEventFire(
		storage.onDataChanged,
		React.useCallback((storageKey) => storageKey === STORAGE_KEY.RESOURCES_TO_TAGS, []),
	);

	async function openFile(uri: UriComponents) {
		const executablePath = URI.from(uri).fsPath;

		const success = await shell.openPath(executablePath);
		if (!success) {
			logger.error(`electron shell openItem did not succeed`, undefined, { uri });
		}
	}

	async function moveFilesToTrash(uris: UriComponents[]) {
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
		return navigationActions.updateFilesOfCwd(cwd);
	}

	async function cutOrCopyFiles(files: UriComponents[], cut: boolean) {
		await clipboard.writeResources(files.map((file) => URI.from(file)));
		dispatch(actions.cutOrCopyFiles({ cut }));
	}

	async function pasteFiles() {
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
					const tagsOfSourceFile = getTagsOfFile({
						uri: sourceFileURI,
						ctime: sourceFileStat.ctime,
					}).map((t) => t.id);
					await addTags([targetFileURI], tagsOfSourceFile);

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
		return navigationActions.updateFilesOfCwd(cwd);
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

	function getTagsOfFile(file: { uri: UriComponents; ctime: number }): Tag[] {
		const tagIdsOfFile = storage.get(STORAGE_KEY.RESOURCES_TO_TAGS)?.[
			URI.from(file.uri).toString()
		];

		if (
			tagIdsOfFile === undefined ||
			tagIdsOfFile.tags.length === 0 ||
			tagIdsOfFile.ctimeOfFile !== file.ctime
		) {
			return [];
		}

		const tags = tagsActions.getTags();
		const tagsOfFile = Object.entries(tags)
			.map(([id, otherValues]) => ({ ...otherValues, id }))
			.filter((tag) => tagIdsOfFile.tags.some((tagId) => tagId === tag.id));

		logger.debug(`got tags of file from storage`, { file, tagsOfFile });

		return tagsOfFile;
	}

	async function addTags(files: UriComponents[], tagIds: string[]) {
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

		await Promise.all(
			files.map(async (file) => {
				const fileStat = await fileSystem.resolve(URI.from(file), { resolveMetadata: true });

				let existingTagsOfFile = fileToTagsMap[URI.from(file).toString()];
				if (existingTagsOfFile === undefined || existingTagsOfFile.ctimeOfFile !== fileStat.ctime) {
					fileToTagsMap[URI.from(file).toString()] = { ctimeOfFile: fileStat.ctime, tags: [] };
				}
				fileToTagsMap[URI.from(file).toString()]!.tags.push(...tagIds);
			}),
		);

		storage.store(STORAGE_KEY.RESOURCES_TO_TAGS, fileToTagsMap);

		logger.debug(`tags to files added and stored in storage!`);
	}

	function removeTags(files: UriComponents[], tagIds: string[]) {
		logger.debug(`removing tags from files...`, { files, tagIds });

		const fileToTagsMap = storage.get(STORAGE_KEY.RESOURCES_TO_TAGS);

		if (fileToTagsMap === undefined) {
			logger.debug(`tags from files removed (no tags were present at all)`);
			return;
		}

		for (const file of files) {
			const existingTagsOfFile = fileToTagsMap[URI.from(file).toString()]?.tags;
			if (existingTagsOfFile !== undefined) {
				fileToTagsMap[URI.from(file).toString()]!.tags = existingTagsOfFile.filter(
					(existingTagId) => !tagIds.some((tagIdToRemove) => tagIdToRemove === existingTagId),
				);
			}
		}

		storage.store(STORAGE_KEY.RESOURCES_TO_TAGS, fileToTagsMap);

		logger.debug(`tags from files removed!`);
	}

	return {
		moveFilesToTrash,
		openFile,
		cutOrCopyFiles,
		pasteFiles,
		addTags,
		getTagsOfFile,
		removeTags,
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
