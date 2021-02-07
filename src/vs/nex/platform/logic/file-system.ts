import * as resources from 'vs/base/common/resources';
import { URI, UriComponents } from 'vs/base/common/uri';
import {
	IFileService,
	FileOperationError,
	FileOperationResult,
	IFileStat,
} from 'vs/platform/files/common/files';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';

import { createLogger } from 'vs/nex/base/logger/logger';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { File, FILE_TYPE, RESOURCES_SCHEME } from 'vs/nex/platform/file-types';
import { arrays } from 'vs/nex/base/utils/arrays.util';

const logger = createLogger('nexFileSystem');
export const NexFileSystem = createDecorator<NexFileSystem>('nexFileSystem');

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type NexFileSystem = Pick<IFileService, 'resolve' | 'del' | 'copy' | 'move'> & {
	_serviceBrand: undefined;

	checkDirectory(path: string): Promise<boolean>;
};

export class NexFileSystemImpl implements NexFileSystem {
	public _serviceBrand: undefined;

	public constructor(@IFileService private readonly fileService: IFileService) {}

	public resolve = this.fileService.resolve.bind(this.fileService);
	public del = this.fileService.del.bind(this.fileService);
	public copy = this.fileService.copy.bind(this.fileService);
	public move = this.fileService.move.bind(this.fileService);

	public checkDirectory = async (path: string) => {
		try {
			const parsedUri = uriHelper.parseUri(RESOURCES_SCHEME.FILE_SYSTEM, path);
			if (!parsedUri) {
				return false;
			}

			const stat = await this.fileService.resolve(parsedUri);

			return stat.isDirectory;
		} catch (error) {
			if (
				!(error instanceof FileOperationError) ||
				error.fileOperationResult !== FileOperationResult.FILE_NOT_FOUND
			) {
				logger.error('unexpected error occured', error);
			}
			return false;
		}
	};
}

registerSingleton(NexFileSystem, NexFileSystemImpl);

export function mapFileStatToFile(file: IFileStat): File {
	const fileType = file.isDirectory
		? FILE_TYPE.DIRECTORY
		: file.isSymbolicLink
		? FILE_TYPE.SYMBOLIC_LINK
		: file.isFile
		? FILE_TYPE.FILE
		: FILE_TYPE.UNKNOWN;

	return {
		id: file.resource.toString(),
		fileType,
		uri: file.resource.toJSON(),
		size: file.size,
		mtime: file.mtime,
		ctime: file.ctime,
	};
}

export function getDistinctParents(files: UriComponents[]): UriComponents[] {
	return arrays.uniqueValues(
		files.map((file) => resources.dirname(URI.from(file))),
		(item) => URI.from(item).toString(),
	);
}
