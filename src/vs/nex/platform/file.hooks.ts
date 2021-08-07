import * as React from 'react';
import { shell } from 'electron';

import * as uuid from 'vs/base/common/uuid';
import { URI, UriComponents } from 'vs/base/common/uri';
import { CancellationTokenSource } from 'vs/base/common/cancellation';
import { IFileStatWithMetadata } from 'vs/platform/files/common/files';

import { actions } from 'vs/nex/platform/store/file-provider/file-provider.slice';
import { useNexFileSystem } from 'vs/nex/NexFileSystem.provider';
import { useNexClipboard } from 'vs/nex/NexClipboard.provider';
import { useNexStorage } from 'vs/nex/NexStorage.provider';
import { useDispatch } from 'vs/nex/platform/store/store';
import {
	useFileProviderProcesses,
	useRefreshFiles,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import {
	DeleteProcess,
	FileStatMap,
	PROCESS_STATUS,
	PROCESS_TYPE,
	Tag,
} from 'vs/nex/platform/file-types';
import { STORAGE_KEY } from 'vs/nex/platform/logic/storage';
import { getDistinctParents, NexFileSystem } from 'vs/nex/platform/logic/file-system';
import { createLogger } from 'vs/nex/base/logger/logger';
import { CustomError } from 'vs/nex/base/custom-error';
import { useTagsActions } from 'vs/nex/platform/tag.hooks';
import { useRerenderOnEventFire } from 'vs/nex/platform/store/util/hooks.util';

const logger = createLogger('file.hooks');

export type FileActions = ReturnType<typeof useFileActions>;

export function useFileActions() {
	const dispatch = useDispatch();
	const processes = useFileProviderProcesses();

	const fileSystem = useNexFileSystem();
	const clipboard = useNexClipboard();
	const storage = useNexStorage();

	const refreshFiles = useRefreshFiles();
	const tagsActions = useTagsActions();

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

	function scheduleMoveFilesToTrash(uris: UriComponents[]) {
		const deleteProcess: Omit<DeleteProcess, 'status'> = {
			type: PROCESS_TYPE.DELETE,
			id: uuid.generateUuid(),
			uris,
		};
		dispatch(actions.addDeleteProcess(deleteProcess));
	}

	async function runDeleteProcess(deleteProcessId: string, options: { useTrash: boolean }) {
		const deleteProcess = processes.find((process) => process.id === deleteProcessId);
		if (!deleteProcess || deleteProcess.type !== PROCESS_TYPE.DELETE) {
			throw new Error(`could not find delete process, deleteProcessId=${deleteProcessId}`);
		}

		dispatch(actions.updateDeleteProcess({ id: deleteProcessId, status: PROCESS_STATUS.RUNNING }));

		// delete all files (in parallel)
		try {
			await Promise.all(
				deleteProcess.uris.map(async (uri) => {
					try {
						await fileSystem.del(URI.from(uri), { useTrash: options.useTrash, recursive: true });
					} catch (err) {
						logger.error(`could not delete files`, err);
						throw err;
					}
				}),
			);
		} catch (err: unknown) {
			dispatch(
				actions.updateDeleteProcess({
					id: deleteProcessId,
					status: PROCESS_STATUS.FAILURE,
					error: err instanceof Error ? err.message : `Unknown error occured`,
				}),
			);
		}

		dispatch(actions.updateDeleteProcess({ id: deleteProcessId, status: PROCESS_STATUS.SUCCESS }));

		// invalidate files of all affected directories
		const distinctParents = getDistinctParents(deleteProcess.uris);
		await Promise.all(distinctParents.map((directory) => refreshFiles(directory)));
	}

	function removeProcess(processId: string) {
		dispatch(actions.removeProcess({ id: processId }));
	}

	async function cutOrCopyFiles(files: UriComponents[], cut: boolean) {
		await clipboard.writeResources(files.map((file) => URI.from(file)));
		dispatch(actions.cutOrCopyFiles({ cut }));
	}

	async function renameFile(sourceFileURI: UriComponents, newName: string) {
		const sourceFileStat = await fileSystem.resolve(URI.from(sourceFileURI), {
			resolveMetadata: true,
		});
		const targetFileURI = URI.joinPath(URI.from(sourceFileURI), '..', newName);
		await executeCopyOrMove({
			sourceFileURI: URI.from(sourceFileURI),
			sourceFileStat,
			targetFileURI,
			pasteShouldMove: true,
			fileTagActions: {
				getTagsOfFile,
				addTags,
				removeTags,
			},
			refreshFiles,
			fileSystem,
		});
		const distinctParents = getDistinctParents([sourceFileURI, targetFileURI]);
		await Promise.all(distinctParents.map((directory) => refreshFiles(directory)));
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
		scheduleMoveFilesToTrash,
		runDeleteProcess,
		removeProcess,
		openFile,
		cutOrCopyFiles,
		renameFile,
		resolveDeep,
		addTags,
		getTagsOfFile,
		removeTags,
	};
}

export async function executeCopyOrMove({
	sourceFileURI,
	sourceFileStat,
	targetFileURI,
	pasteShouldMove,
	cancellationTokenSource,
	progressCb,
	fileTagActions,
	refreshFiles,
	fileSystem,
}: {
	sourceFileURI: URI;
	targetFileURI: URI;
	sourceFileStat: IFileStatWithMetadata;
	pasteShouldMove: boolean;
	cancellationTokenSource?: CancellationTokenSource;
	progressCb?: (newBytesRead: number, forSource: URI) => void;
	fileTagActions: {
		getTagsOfFile: FileActions['getTagsOfFile'];
		addTags: FileActions['addTags'];
		removeTags: FileActions['removeTags'];
	};
	refreshFiles: (directory: UriComponents) => Promise<void>;
	fileSystem: NexFileSystem;
}) {
	// Move/Copy File
	const operation = pasteShouldMove
		? fileSystem.move(sourceFileURI, targetFileURI, false, {
				token: cancellationTokenSource?.token,
				progressCb,
		  })
		: fileSystem.copy(sourceFileURI, targetFileURI, false, {
				token: cancellationTokenSource?.token,
				progressCb,
		  });
	await operation;

	// Also copy tags to destination
	const tagsOfSourceFile = fileTagActions
		.getTagsOfFile({
			uri: sourceFileURI,
			ctime: sourceFileStat.ctime,
		})
		.map((t) => t.id);
	await fileTagActions.addTags([targetFileURI], tagsOfSourceFile);

	// If move operation was performed, remove tags from source URI
	if (pasteShouldMove) {
		fileTagActions.removeTags([sourceFileURI], tagsOfSourceFile);
	}

	// invalidate files of the target directory
	const distinctParents = getDistinctParents([sourceFileURI, targetFileURI]);
	await Promise.all(distinctParents.map((directory) => refreshFiles(directory)));
}
