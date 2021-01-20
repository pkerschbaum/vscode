import * as resources from 'vs/base/common/resources';
import { URI, UriComponents } from 'vs/base/common/uri';

import { actions } from 'vs/nex/platform/store/file-provider/file-provider.slice';
import { mapFileStatToFile } from 'vs/nex/platform/logic/file-system';
import { useNexFileSystem } from 'vs/nex/NexFileSystem.provider';
import { useDispatch } from 'vs/nex/platform/store/store';
import { useFileProviderCwd } from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { File, RESOURCES_SCHEME, Tag } from 'vs/nex/platform/file-types';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';

export type FileForUI = File & {
	name: string;
	extension?: string;
	tags: Tag[];
	iconClasses: string[];
};

export function useNavigationActions() {
	const dispatch = useDispatch();
	const cwd = useFileProviderCwd();
	const fileSystem = useNexFileSystem();

	async function changeDirectory(newDir: string) {
		const parsedUri = uriHelper.parseUri(RESOURCES_SCHEME.FILE_SYSTEM, newDir);

		// check if the directory is a valid directory (i.e., is a URI-parsable string)
		if (!parsedUri) {
			throw Error(
				`could not change directory, reason: path is not a valid directory. path: ${newDir}`,
			);
		}

		// if newDir is the current working directory, no action is necessary
		const cwdTrailingSepRemoved = resources.removeTrailingPathSeparator(URI.from(cwd));
		const parsedUriTrailingSepRemoved = resources.removeTrailingPathSeparator(parsedUri);

		if (resources.isEqual(cwdTrailingSepRemoved, parsedUriTrailingSepRemoved)) {
			return;
		}

		// check if the directory is a valid directory (i.e., the directory is accessible)
		const stats = await fileSystem.resolve(parsedUri);
		if (!stats.isDirectory) {
			throw Error(
				`could not change directory, reason: uri is not a valid directory. uri: ${parsedUri}`,
			);
		}

		// if newDir is not the current working directory, and is a valid directory => change to the new directory
		// first, dispatch files without metadata
		const newCmd = parsedUri.toJSON();
		const children = stats.children ?? [];
		dispatch(
			actions.changeCwd({
				newDir: newCmd,
				files: children.map(mapFileStatToFile),
			}),
		);

		// then, resolve and dispatch files with metadata
		return updateFilesOfCwd(newCmd);
	}

	async function updateFilesOfCwd(cwd: UriComponents) {
		// resolve and dispatch files with metadata
		const statsWithMetadata = await fileSystem.resolve(URI.from(cwd), {
			resolveMetadata: true,
		});
		if (statsWithMetadata.children) {
			dispatch(
				actions.updateStatsOfFiles({
					files: statsWithMetadata.children.map(mapFileStatToFile),
				}),
			);
		}
	}

	return {
		changeDirectory,
		updateFilesOfCwd,
	};
}
