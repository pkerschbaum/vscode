import { URI, UriComponents } from 'vs/base/common/uri';
import { IFileService, IFileStat } from 'vs/platform/files/common/files';
import { INativeHostService } from 'vs/platform/native/electron-sandbox/native';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { revealResourcesInOS } from 'vs/workbench/contrib/files/electron-sandbox/fileCommands';

import { File, FILE_TYPE } from 'vs/nex/platform/file-types';
import { arrays } from 'vs/nex/base/utils/arrays.util';

export const NexFileSystem = createDecorator<NexFileSystem>('nexFileSystem');

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type NexFileSystem = Pick<
	IFileService,
	'resolve' | 'del' | 'copy' | 'move' | 'createFolder'
> & {
	_serviceBrand: undefined;

	revealResourcesInOS(resources: UriComponents[]): void;
};

export class NexFileSystemImpl implements NexFileSystem {
	public _serviceBrand: undefined;

	public constructor(
		@IFileService private readonly fileService: IFileService,
		@INativeHostService private readonly nativeHostService: INativeHostService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {}

	public resolve = this.fileService.resolve.bind(this.fileService);
	public del = this.fileService.del.bind(this.fileService);
	public copy = this.fileService.copy.bind(this.fileService);
	public move = this.fileService.move.bind(this.fileService);
	public createFolder = this.fileService.createFolder.bind(this.fileService);

	public revealResourcesInOS = (resources: UriComponents[]): void => {
		revealResourcesInOS(
			resources.map((r) => URI.from(r)),
			this.nativeHostService,
			this.workspaceContextService,
		);
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
		files.map((file) => URI.joinPath(URI.from(file), '..')),
		(item) => item.toString(),
	);
}
