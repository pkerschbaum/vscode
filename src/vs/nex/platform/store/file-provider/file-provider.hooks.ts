import * as React from 'react';
import { useQuery, useQueryClient } from 'react-query';

import { URI, UriComponents } from 'vs/base/common/uri';
import { FileKind } from 'vs/platform/files/common/files';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';

import { useModelService } from 'vs/nex/ModelService.provider';
import { useModeService } from 'vs/nex/ModeService.provider';
import { useNexFileSystem } from 'vs/nex/NexFileSystem.provider';
import { useSelector } from 'vs/nex/platform/store/store';
import { File, FILE_TYPE, PASTE_STATUS, Tag } from 'vs/nex/platform/file-types';
import { mapFileStatToFile } from 'vs/nex/platform/logic/file-system';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { objects } from 'vs/nex/base/utils/objects.util';

export const useFileProviderExplorers = () =>
	Object.entries(useSelector((state) => state.fileProvider.explorers)).map(
		([explorerId, value]) => ({
			explorerId,
			...value,
		}),
	);

export const useFileProviderCwd = (explorerId: string) =>
	useSelector((state) => state.fileProvider.explorers[explorerId].cwd);

export const useFileProviderFocusedExplorerId = () =>
	useSelector((state) => state.fileProvider.focusedExplorerId);

export const useFileProviderDraftPasteState = () =>
	useSelector((state) => state.fileProvider.draftPasteState);

export const useFileProviderProcesses = () =>
	useSelector((state) => state.fileProvider.processes).map((process) => {
		if (process.type === 'paste') {
			return {
				...process,
				bytesProcessed:
					process.status === PASTE_STATUS.FINISHED ? process.totalSize : process.bytesProcessed,
			};
		}

		return process;
	});

function useFiles({
	directory,
	resolveMetadata,
}: {
	directory: UriComponents;
	resolveMetadata: boolean;
}) {
	const fileSystem = useNexFileSystem();

	const filesQuery = useQuery(
		['files', URI.from(directory).toString(), { resolveMetadata }],
		async () => {
			const statsWithMetadata = await fileSystem.resolve(URI.from(directory), { resolveMetadata });

			if (!statsWithMetadata.children) {
				return [];
			}
			return statsWithMetadata.children.map(mapFileStatToFile);
		},
		{
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
			retry: false,
		},
	);

	return filesQuery;
}

export function useInvalidateFiles() {
	const queryClient = useQueryClient();
	return React.useCallback(
		async (directory: UriComponents) => {
			await queryClient.invalidateQueries(['files', URI.from(directory).toString()]);
		},
		[queryClient],
	);
}

export type FileForUI = File & {
	name: string;
	extension?: string;
	tags: Tag[];
	iconClasses: string[];
};
export const useFileProviderFiles = (explorerId: string): FileForUI[] => {
	const modelService = useModelService();
	const modeService = useModeService();

	const cwd = useSelector((state) => state.fileProvider.explorers[explorerId].cwd);
	const filesQueryWithoutMetadata = useFiles({ directory: cwd, resolveMetadata: false });
	const filesQueryWithMetadata = useFiles({ directory: cwd, resolveMetadata: true });

	let filesToUse;
	if (filesQueryWithMetadata.data !== undefined) {
		filesToUse = filesQueryWithMetadata.data;
	}

	if (filesToUse === undefined && filesQueryWithoutMetadata.data !== undefined) {
		filesToUse = filesQueryWithoutMetadata.data;
	}

	filesToUse = filesToUse ?? [];

	return Object.values(filesToUse)
		.filter(objects.isNotNullish)
		.map((file) => {
			const { fileName, extension } = uriHelper.extractNameAndExtension(file.uri);
			const fileType = mapFileTypeToFileKind(file.fileType);

			const iconClasses = getIconClasses(modelService, modeService, URI.from(file.uri), fileType);

			const fileForUI: FileForUI = {
				...file,
				extension,
				iconClasses,
				name: fileName,
				tags: [],
			};
			return fileForUI;
		});
};

function mapFileTypeToFileKind(fileType: FILE_TYPE) {
	if (fileType === FILE_TYPE.FILE) {
		return FileKind.FILE;
	} else if (fileType === FILE_TYPE.DIRECTORY) {
		return FileKind.FOLDER;
	} else {
		return undefined;
	}
}
