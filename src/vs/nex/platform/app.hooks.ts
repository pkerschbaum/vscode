import { useNexFileSystem } from 'vs/nex/NexFileSystem.context';
import { useDispatch } from 'vs/nex/platform/store/store';
import {
	actions,
	generateExplorerId,
} from 'vs/nex/platform/store/file-provider/file-provider.slice';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { RESOURCES_SCHEME } from 'vs/nex/platform/file-types';

export function useAddExplorerPanel() {
	const dispatch = useDispatch();

	const fileSystem = useNexFileSystem();

	async function addExplorerPanel() {
		const explorerId = generateExplorerId();
		const parsedUri = uriHelper.parseUri(RESOURCES_SCHEME.FILE_SYSTEM, 'C:/');
		const stats = await fileSystem.resolve(parsedUri);
		if (!stats.isDirectory) {
			throw Error(
				`could not set intial directory, reason: uri is not a valid directory. uri: ${parsedUri}`,
			);
		}

		dispatch(actions.addExplorer({ explorerId, cwd: parsedUri.toJSON() }));
		dispatch(actions.changeFocusedExplorer({ explorerId }));
	}

	return {
		addExplorerPanel,
	};
}

export function useRemoveExplorerPanel() {
	const dispatch = useDispatch();

	function removeExplorerPanel(explorerId: string) {
		/*
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

	return {
		removeExplorerPanel,
	};
}

export function useChangeFocusedExplorer() {
	const dispatch = useDispatch();

	function changeFocusedExplorer(newFocusedExplorerId: string) {
		dispatch(actions.changeFocusedExplorer({ explorerId: newFocusedExplorerId }));
	}

	return {
		changeFocusedExplorer,
	};
}
