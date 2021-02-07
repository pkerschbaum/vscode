import { UriComponents } from 'vs/base/common/uri';
import { NarrowUnion } from 'vs/nex/base/utils/types.util';
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

export type Process = {
	id: string;
	status: PROCESS_STATUS;
} & (
	| {
			type: 'paste';
			totalSize: number;
			bytesProcessed: number;
			destinationFolder: UriComponents;
	  }
	| {
			type: 'delete';
			uris: UriComponents[];
	  }
);

export enum PROCESS_STATUS {
	PENDING_FOR_USER_INPUT = 'PENDING_FOR_USER_INPUT',
	RUNNING = 'RUNNING',
	SUCCESS = 'SUCCESS',
	FAILURE = 'FAILURE',
}

export type PasteProcess = NarrowUnion<Process, 'type', 'paste'>;

export type DeleteProcess = NarrowUnion<Process, 'type', 'delete'>;

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
