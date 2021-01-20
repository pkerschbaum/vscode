import { URI } from 'vs/base/common/uri';
import { FileKind } from 'vs/platform/files/common/files';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';

import { useModelService } from 'vs/nex/ModelService.provider';
import { useModeService } from 'vs/nex/ModeService.provider';
import { useSelector } from 'vs/nex/platform/store/store';
import { File, FILE_TYPE, PASTE_STATUS, Tag } from 'vs/nex/platform/file-types';
import { objects } from 'vs/nex/base/utils/objects.util';

export type FileForUI = File & {
	name: string;
	extension?: string;
	tags: Tag[];
	iconClasses: string[];
};

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
					...file,
					extension,
					iconClasses,
					name: fileName,
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
