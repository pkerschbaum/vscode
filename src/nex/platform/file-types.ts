import { DeepReadonly } from 'ts-essentials';

import { URI } from 'vs/base/common/uri';
import { FileKind } from 'vs/platform/files/common/files';

export enum FileProviderActionTypes {
	CHANGE_CWD = 'CHANGE_CWD',
	UPDATE_DIR_CONTENTS = 'UPDATE_DIR_CONTENTS',
	UPDATE_FILES = 'UPDATE_FILES',
	CUT_OR_COPY_FILES = 'CUT_OR_COPY_FILES',
	ADD_PASTE_PROCESS = 'ADD_PASTE_PROCESS',
	UPDATE_PASTE_PROCESS = 'UPDATE_PASTE_PROCESS',
	FINISH_PASTE_PROCESS = 'FINISH_PASTE_PROCESS',
	RESET_PASTE_STATE = 'RESET_PASTE_STATE',
}

export enum FileType {
	File, Directory, SymbolicLink, Unknown,
}

export enum ResourceScheme {
	FileSystem = 'file://',
}

export enum PasteStatus {
	STARTED,
	FINISHED,
}

export type FileProviderState = DeepReadonly<FileProviderStateBase>;

interface FileProviderStateBase {
	scheme: ResourceScheme;
	cwd: URI;
	files: FileMap;
	filesToPaste: URI[];
	pasteShouldMove: boolean;
	pasteProcesses: Array<{ id: string; status: PasteStatus; totalSize: number; bytesProcessed: number }>;
}

export interface FileMap {
	[id: string]: File;
}

export interface File {
	id: string;
	fileType: FileType;
	uri: URI;
	size?: number;
	lastChangedAt?: number;
}

export function mapFileTypeToFileKind(fileType: FileType): FileKind {
	if (fileType === FileType.File) {
		return FileKind.FILE;
	} else if (fileType === FileType.Directory) {
		return FileKind.FOLDER;
	} else {
		throw new Error(`could not map FileType to FileKind, FileType is: ${fileType}`);
	}
}
