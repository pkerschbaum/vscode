import * as React from 'react';

import { URI } from 'vs/base/common/uri';

import { NexClipboard } from 'vs/nex/platform/logic/clipboard';
import { createContext } from 'vs/nex/ui/utils/create-context';

const context = createContext<NexClipboard>('NexClipboard');
export const useNexClipboard = context.useContextValue;
export const NexClipboardProvider = context.Provider;

const resourcesContext = createContext<URI[]>('ClipboardResources');
export const useClipboardResources = resourcesContext.useContextValue;
export const ClipboardResourcesContext: React.FC<{ children: React.ReactElement }> = ({
	children,
}) => {
	const [clipboardResources, setClipboardResources] = React.useState<URI[]>([]);
	const clipboard = useNexClipboard();

	React.useEffect(
		function registerOnClipboardChangedHandler() {
			let lastPromise;

			const disposable = clipboard.onClipboardChanged(async () => {
				const thisPromise = clipboard.readResources();
				lastPromise = thisPromise;
				const resources = await thisPromise;

				// discard result if event listener got triggered in the meantime (and thus, a newer
				// readResources promise is currently inflight)
				if (thisPromise !== lastPromise) {
					return;
				}

				setClipboardResources(resources);
			});

			return () => disposable.dispose();
		},
		[clipboard],
	);

	return (
		<resourcesContext.Provider value={clipboardResources}>{children}</resourcesContext.Provider>
	);
};
