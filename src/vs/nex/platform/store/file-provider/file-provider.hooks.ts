import { URI } from 'vs/base/common/uri';
import { FileKind } from 'vs/platform/files/common/files';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';

import { useModelService } from 'vs/nex/ModelService.provider';
import { useModeService } from 'vs/nex/ModeService.provider';
import { useSelector } from 'vs/nex/platform/store/store';
import { File, FILE_TYPE, PASTE_STATUS, Tag } from 'vs/nex/platform/file-types';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { objects } from 'vs/nex/base/utils/objects.util';

export const useFileProviderExplorers = () => useSelector((state) => state.fileProvider.explorers);

export const useFileProviderCwd = (explorerId: string) =>
	useSelector((state) => state.fileProvider.explorers[explorerId].cwd);

export const useFileProviderFocusedExplorerId = () =>
	useSelector((state) => state.fileProvider.focusedExplorerId);

export const useFileProviderDraftPasteState = () =>
	useSelector((state) => state.fileProvider.draftPasteState);

export const useFileProviderPasteProcesses = () =>
	useSelector((state) => state.fileProvider.pasteProcesses).map((process) => ({
		...process,
		bytesProcessed:
			process.status === PASTE_STATUS.FINISHED ? process.totalSize : process.bytesProcessed,
	}));

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
	const files = useSelector((state) => state.fileProvider.files[URI.from(cwd).toString()]);

	if (files === undefined) {
		return [];
	}

	return Object.values(files)
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
