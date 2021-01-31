import { actions } from 'vs/nex/platform/store/file-provider/file-provider.slice';
import { useDispatch } from 'vs/nex/platform/store/store';

export function useAppActions() {
	const dispatch = useDispatch();

	function changeFocusedExplorer(newFocusedExplorerId: string) {
		dispatch(actions.changeFocusedExplorer({ explorerId: newFocusedExplorerId }));
	}

	return {
		changeFocusedExplorer,
	};
}
