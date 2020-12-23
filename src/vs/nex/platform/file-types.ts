import { UriComponents } from 'vs/base/common/uri';
import { IFileStatWithMetadata } from 'vs/platform/files/common/files';

export enum FileType {
	File,
	Directory,
	SymbolicLink,
	Unknown,
}

export enum ResourceScheme {
	FileSystem = 'file://',
}

export enum PasteStatus {
	STARTED,
	FINISHED,
}

export type FileMap = {
	[stringifiedUri: string]: File | undefined;
};

export type File = {
	id: string;
	fileType: FileType;
	uri: UriComponents;
	size?: number;
	lastChangedAt?: number;
};

export type FileStatMap = {
	[uri: string]: IFileStatWithMetadata;
};
