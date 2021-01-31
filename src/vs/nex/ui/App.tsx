import * as React from 'react';
import { Box, Tabs, Tab, Button } from '@material-ui/core';

import { URI } from 'vs/base/common/uri';

import { styles } from 'vs/nex/ui/App.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { ExplorerPanel } from 'vs/nex/ui/ExplorerPanel';
import {
	useFileProviderCwd,
	useFileProviderExplorers,
	useFileProviderFocusedExplorerId,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useAppActions } from 'vs/nex/platform/app.hooks';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';

export const App: React.FC = () => {
	const explorers = useFileProviderExplorers();
	const focusedExplorerId = useFileProviderFocusedExplorerId();
	const appActions = useAppActions();

	// on mount, add first (initial) explorer panel
	React.useEffect(() => {
		appActions.addExplorerPanel();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<Box className="show-file-icons" css={[styles.container, commonStyles.fullHeight]}>
			<Stack stretchContainer alignItems="stretch" spacing={0}>
				<Stack direction="column" alignItems="stretch">
					<Tabs
						css={styles.tabPanel}
						orientation="vertical"
						variant="scrollable"
						selectionFollowsFocus
						value={focusedExplorerId}
						onChange={(_, newValue) => appActions.changeFocusedExplorer(newValue)}
					>
						{Object.entries(explorers).map(([explorerId, value]) => (
							<Tab
								key={explorerId}
								css={styles.tab}
								label={uriHelper.extractNameAndExtension(value.cwd).fileName}
								value={explorerId}
							/>
						))}
					</Tabs>
					<Button onClick={appActions.addExplorerPanel}>Add Tab</Button>
				</Stack>
				<Box css={[commonStyles.fullHeight, commonStyles.flex.shrinkAndFitHorizontal]}>
					{focusedExplorerId !== undefined &&
						Object.keys(explorers).map((explorerId) => (
							<TabPanel key={explorerId} value={focusedExplorerId} index={explorerId}>
								<ExplorerPanelContainer explorerId={explorerId} />
							</TabPanel>
						))}
				</Box>
			</Stack>
		</Box>
	);
};

const ExplorerPanelContainer: React.FC<{ explorerId: string }> = ({ explorerId }) => {
	const cwd = useFileProviderCwd(explorerId);

	return <ExplorerPanel key={URI.from(cwd).toString()} explorerId={explorerId} />;
};

type TabPanelProps = {
	index: string;
	value: string;
	children: React.ReactNode;
};

const TabPanel: React.FC<TabPanelProps> = ({ value, index, children }) => {
	return (
		<Box
			css={[
				commonStyles.overlayChild,
				commonStyles.fullHeight,
				commonStyles.fullWidth,
				value !== index ? commonStyles.hidden : undefined,
			]}
		>
			{children}
		</Box>
	);
};
