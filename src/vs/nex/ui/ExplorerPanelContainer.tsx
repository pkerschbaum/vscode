import * as React from 'react';

import { URI } from 'vs/base/common/uri';

import { ExplorerPanel } from 'vs/nex/ui/explorer-panel/ExplorerPanel';
import { useFileProviderCwd } from 'vs/nex/platform/store/file-provider/file-provider.hooks';

type ExplorerPanelContainerProps = { explorerId: string };

export const ExplorerPanelContainer = React.memo<ExplorerPanelContainerProps>(
	function ExplorerPanelContainer({ explorerId }) {
		const cwd = useFileProviderCwd(explorerId);

		return <ExplorerPanel key={URI.from(cwd).toString()} explorerId={explorerId} />;
	},
);
