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
	STARTED,
	FINISHED,
}

export type FileMap = {
	[stringifiedUri: string]: File | undefined;
};

export type File = {
	id: string;
	fileType: FILE_TYPE;
	uri: UriComponents;
	size?: number;
	lastChangedAt?: number;
};

export type FileStatMap = {
	[uri: string]: IFileStatWithMetadata;
};
