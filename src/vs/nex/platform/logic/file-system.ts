import { URI } from 'vs/base/common/uri';
import {
	IFileService,
	FileOperationError,
	FileOperationResult,
	IFileStatWithMetadata,
	IResolveMetadataFileOptions,
	IResolveFileOptions,
	IFileStat,
} from 'vs/platform/files/common/files';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { createLogger } from 'vs/nex/base/logger/logger';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { File, FILE_TYPE, ResourceScheme } from 'vs/nex/platform/file-types';

const logger = createLogger('nexFileSystem');
export const NexFileSystem = createDecorator<NexFileSystem>('nexFileSystem');

export interface NexFileSystem {
	_serviceBrand: any; // eslint-disable-line @typescript-eslint/no-explicit-any

	checkDirectory(path: string): Promise<boolean>;
	resolve(resource: URI, options: IResolveMetadataFileOptions): Promise<IFileStatWithMetadata>;
	resolve(resource: URI, options?: IResolveFileOptions): Promise<IFileStat>;
	del(resource: URI, options?: { useTrash?: boolean; recursive?: boolean }): Promise<void>;
	copy(
		source: URI,
		target: URI,
		overwrite?: boolean,
		progressCb?: (newBytesRead: number, forSource: URI) => void,
	): Promise<IFileStatWithMetadata>;
	move(
		source: URI,
		target: URI,
		overwrite?: boolean,
		progressCb?: (newBytesRead: number, forSource: URI) => void,
	): Promise<IFileStatWithMetadata>;
}

export class NexFileSystemImpl implements NexFileSystem {
	public _serviceBrand: any; // eslint-disable-line @typescript-eslint/no-explicit-any

	public resolve = this.fileService.resolve.bind(this.fileService);
	public del = this.fileService.del.bind(this.fileService);
	public copy = this.fileService.copy.bind(this.fileService);
	public move = this.fileService.move.bind(this.fileService);

	public constructor(@IFileService private readonly fileService: IFileService) {}

	public checkDirectory = async (path: string) => {
		try {
			const parsedUri = uriHelper.parseUri(ResourceScheme.FileSystem, path);
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
		lastChangedAt: file.mtime,
	};
}
