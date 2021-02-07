import { UriComponents } from 'vs/base/common/uri';
import { IFileStatWithMetadata } from 'vs/platform/files/common/files';

export enum FILE_TYPE {
	FILE = 'FILE',
	DIRECTORY = 'DIRECTORY',
	SYMBOLIC_LINK = 'SYMBOLIC_LINK',
	UNKNOWN = 'UNKNOWN',
}

export enum RESOURCES_SCHEME {
	FILE_SYSTEM = 'file://',
}

export type Process = PasteProcess | DeleteProcess;

export type PasteProcess = {
	id: string;
	type: 'paste';
	status: PASTE_STATUS;
	totalSize: number;
	bytesProcessed: number;
	destinationFolder: UriComponents;
};

export enum PASTE_STATUS {
	STARTED = 'STARTED',
	FINISHED = 'FINISHED',
}

export type DeleteProcess = {
	id: string;
	type: 'delete';
	status: DELETE_STATUS;
	uris: UriComponents[];
};

export enum DELETE_STATUS {
	SCHEDULED = 'SCHEDULED',
	RUNNING = 'RUNNING',
	FINISHED = 'FINISHED',
}

export type FileMap = {
	[stringifiedUri: string]: File | undefined;
};

export type File = {
	id: string;
	fileType: FILE_TYPE;
	uri: UriComponents;
	size?: number;
	ctime?: number;
	mtime?: number;
};

export type FileStatMap = {
	[uri: string]: IFileStatWithMetadata;
};

type TagId = string;
export type FileToTags = { [uri: string]: { ctimeOfFile: number; tags: TagId[] } | undefined };
export type Tag = { id: TagId; name: string; colorHex: string };
