import { URI } from 'vs/base/common/uri';
import { IFileStat } from 'vs/platform/files/common/files';
import { FileProviderActionTypes } from 'vs/nex/platform/file-types';

export type FileProviderActions = ReturnType<typeof changeCwd>
	| ReturnType<typeof updateStatsOfFiles>
	| ReturnType<typeof cutOrCopyFiles>
	| ReturnType<typeof addPasteProcess>
	| ReturnType<typeof updatePasteProcess>
	| ReturnType<typeof finishPasteProcess>
	| ReturnType<typeof resetPasteState>;

export function changeCwd(newDir: URI, files?: IFileStat[]) {
	if (files === undefined) {
		files = [];
	}
	return {
		type: FileProviderActionTypes.CHANGE_CWD as FileProviderActionTypes.CHANGE_CWD,
		payload: { newDir, files },
	};
}

export function updateStatsOfFiles(files: IFileStat[]) {
	return {
		type: FileProviderActionTypes.UPDATE_FILES as FileProviderActionTypes.UPDATE_FILES,
		payload: { files },
	};
}

export function cutOrCopyFiles(files: URI[], cut: boolean) {
	return {
		type: FileProviderActionTypes.CUT_OR_COPY_FILES as FileProviderActionTypes.CUT_OR_COPY_FILES,
		payload: { files, cut },
	};
}

export function addPasteProcess(id: string, totalSize: number) {
	return {
		type: FileProviderActionTypes.ADD_PASTE_PROCESS as FileProviderActionTypes.ADD_PASTE_PROCESS,
		payload: { id, totalSize },
	};
}

export function updatePasteProcess(id: string, bytesProcessed: number) {
	return {
		type: FileProviderActionTypes.UPDATE_PASTE_PROCESS as FileProviderActionTypes.UPDATE_PASTE_PROCESS,
		payload: { id, bytesProcessed },
	};
}

export function finishPasteProcess(id: string) {
	return {
		type: FileProviderActionTypes.FINISH_PASTE_PROCESS as FileProviderActionTypes.FINISH_PASTE_PROCESS,
		payload: { id },
	};
}

export function resetPasteState() {
	return { type: FileProviderActionTypes.RESET_PASTE_STATE as FileProviderActionTypes.RESET_PASTE_STATE };
}
