import { UriComponents } from 'vs/base/common/uri';
import { CancellationTokenSource } from 'vs/base/common/cancellation';

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
} & (
	| {
			status:
				| PROCESS_STATUS.RUNNING
				| PROCESS_STATUS.SUCCESS
				| PROCESS_STATUS.ABORT_REQUESTED
				| PROCESS_STATUS.ABORT_SUCCESS;
			type: PROCESS_TYPE.PASTE;
			pasteShouldMove: boolean;
			sourceUris: UriComponents[];
			totalSize: number;
			bytesProcessed: number;
			progressOfAtLeastOneSourceIsIndeterminate: boolean;
			destinationFolder: UriComponents;
			cancellationTokenSource: CancellationTokenSource;
	  }
	| {
			status: PROCESS_STATUS.FAILURE;
			type: PROCESS_TYPE.PASTE;
			pasteShouldMove: boolean;
			sourceUris: UriComponents[];
			totalSize: number;
			bytesProcessed: number;
			progressOfAtLeastOneSourceIsIndeterminate: boolean;
			destinationFolder: UriComponents;
			cancellationTokenSource: CancellationTokenSource;
			error: string;
	  }
	| {
			status:
				| PROCESS_STATUS.PENDING_FOR_USER_INPUT
				| PROCESS_STATUS.RUNNING
				| PROCESS_STATUS.SUCCESS;
			type: PROCESS_TYPE.DELETE;
			uris: UriComponents[];
	  }
	| {
			status: PROCESS_STATUS.FAILURE;
			type: PROCESS_TYPE.DELETE;
			uris: UriComponents[];
			error: string;
	  }
);

export enum PROCESS_STATUS {
	PENDING_FOR_USER_INPUT = 'PENDING_FOR_USER_INPUT',
	RUNNING = 'RUNNING',
	SUCCESS = 'SUCCESS',
	FAILURE = 'FAILURE',
	ABORT_REQUESTED = 'ABORT_REQUESTED',
	ABORT_SUCCESS = 'ABORT_SUCCESS',
}

export enum PROCESS_TYPE {
	PASTE = 'PASTE',
	DELETE = 'DELETE',
}

export type PasteProcess = NarrowUnion<Process, 'type', PROCESS_TYPE.PASTE>;

export type DeleteProcess = NarrowUnion<Process, 'type', PROCESS_TYPE.DELETE>;

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
