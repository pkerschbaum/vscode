import * as React from 'react';

import { URI } from 'vs/base/common/uri';

import { ExplorerContextProvider } from 'vs/nex/ui/Explorer.context';
import { ExplorerPanel } from 'vs/nex/ui/explorer-panel/ExplorerPanel';
import { useFileProviderCwd } from 'vs/nex/platform/store/file-provider/file-provider.hooks';

type ExplorerPanelContainerProps = { explorerId: string };

export const ExplorerPanelContainer = React.memo<ExplorerPanelContainerProps>(
	function ExplorerPanelContainer({ explorerId }) {
		const cwd = useFileProviderCwd(explorerId);

		return (
			<ExplorerContextProvider key={URI.from(cwd).toString()}>
				<MemoizedExplorerPanel explorerId={explorerId} />
			</ExplorerContextProvider>
		);
	},
);

const MemoizedExplorerPanel = React.memo<ExplorerPanelContainerProps>(
	function MemoizedExplorerPanel({ explorerId }) {
		return <ExplorerPanel explorerId={explorerId}></ExplorerPanel>;
	},
);
