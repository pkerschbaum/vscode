import * as React from 'react';
import { Box } from '@material-ui/core';

import { URI } from 'vs/base/common/uri';

import { styles } from 'vs/nex/ui/App.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { ExplorerPanel } from 'vs/nex/ui/ExplorerPanel';
import {
	useFileProviderCwd,
	useFileProviderExplorers,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';

export const App: React.FC = () => {
	const explorers = useFileProviderExplorers();

	return (
		<Box className="show-file-icons" css={[styles.container, commonStyles.fullHeight]}>
			{Object.keys(explorers).map((explorerId) => (
				<ExplorerPanelContainer key={explorerId} explorerId={explorerId} />
			))}
		</Box>
	);
};

const ExplorerPanelContainer: React.FC<{ explorerId: string }> = ({ explorerId }) => {
	const cwd = useFileProviderCwd(explorerId);

	return <ExplorerPanel key={URI.from(cwd).toString()} explorerId={explorerId} />;
};
