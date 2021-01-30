import * as React from 'react';

import { URI } from 'vs/base/common/uri';

import { styles } from 'vs/nex/ui/App.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { ExplorerPanel } from 'vs/nex/ui/ExplorerPanel';
import {
	useFileProviderCwd,
	useFileProviderExplorers,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';

export const App: React.FC = () => {
	const explorers = useFileProviderExplorers();

	return (
		<Stack
			className="show-file-icons"
			css={[styles.container, commonStyles.fullHeight]}
			direction="column"
			alignItems="stretch"
			stretchContainer
		>
			{Object.keys(explorers).map((explorerId) => (
				<ExplorerPanelContainer key={explorerId} explorerId={explorerId} />
			))}
		</Stack>
	);
};

const ExplorerPanelContainer: React.FC<{ explorerId: string }> = ({ explorerId }) => {
	const cwd = useFileProviderCwd(explorerId);

	return <ExplorerPanel key={URI.from(cwd).toString()} explorerId={explorerId} />;
};
