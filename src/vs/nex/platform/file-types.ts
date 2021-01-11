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

export enum PASTE_STATUS {
	STARTED = 'STARTED',
	FINISHED = 'FINISHED',
}

export type PasteProcess = {
	id: string;
	status: PASTE_STATUS;
	totalSize: number;
	bytesProcessed: number;
	destinationFolder: UriComponents;
};

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
