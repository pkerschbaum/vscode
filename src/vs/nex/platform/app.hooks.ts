import { useNexFileSystem } from 'vs/nex/NexFileSystem.provider';
import { useDispatch } from 'vs/nex/platform/store/store';
import {
	actions,
	generateExplorerId,
} from 'vs/nex/platform/store/file-provider/file-provider.slice';
import { mapFileStatToFile } from 'vs/nex/platform/logic/file-system';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { RESOURCES_SCHEME } from 'vs/nex/platform/file-types';

export function useAppActions() {
	const dispatch = useDispatch();

	const fileSystem = useNexFileSystem();

	async function addExplorerPanel() {
		const explorerId = generateExplorerId();
		const parsedUri = uriHelper.parseUri(RESOURCES_SCHEME.FILE_SYSTEM, '/home/pkerschbaum');
		const stats = await fileSystem.resolve(parsedUri, { resolveMetadata: true });
		if (!stats.isDirectory) {
			throw Error(
				`could not set intial directory, reason: uri is not a valid directory. uri: ${parsedUri}`,
			);
		}
		const children = stats.children ?? [];

		dispatch(
			actions.addExplorer({
				explorerId,
				cwd: parsedUri.toJSON(),
			}),
		);
		dispatch(
			actions.changeCwd({
				explorerId,
				newCwd: parsedUri.toJSON(),
				files: children.map(mapFileStatToFile),
			}),
		);
	}

	function removeExplorerPanel(explorerId: string) {
		/**
		 * If the explorer gets removed immediately, redux subscriptions (e.g. useSelectors) currently
		 * listening on that explorer will throw errors. So first, mark explorer for deletion, so that
		 * the explorer gets unmounted from the UI and thus, from the React Tree. This will stop all
		 * subscriptions on that explorer.
		 *
		 * After that, remove the explorer.
		 */
		dispatch(actions.markExplorerForRemoval({ explorerId }));
		setTimeout(() => {
			dispatch(actions.removeExplorer({ explorerId }));
		});
	}

	function changeFocusedExplorer(newFocusedExplorerId: string) {
		dispatch(actions.changeFocusedExplorer({ explorerId: newFocusedExplorerId }));
	}

	return {
		addExplorerPanel,
		removeExplorerPanel,
		changeFocusedExplorer,
	};
}
