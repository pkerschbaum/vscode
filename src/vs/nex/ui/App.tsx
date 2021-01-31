import * as React from 'react';
import { Box, Tabs, Tab } from '@material-ui/core';

import { URI } from 'vs/base/common/uri';

import { styles } from 'vs/nex/ui/App.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { ExplorerPanel } from 'vs/nex/ui/ExplorerPanel';
import {
	useFileProviderCwd,
	useFileProviderExplorers,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';

export const App: React.FC = () => {
	const explorers = useFileProviderExplorers();

	const [activeExplorerId, setActiveExplorerId] = React.useState(Object.keys(explorers)[0]);

	return (
		<Box className="show-file-icons" css={[styles.container, commonStyles.fullHeight]}>
			<Stack stretchContainer alignItems="stretch" spacing={0}>
				<Tabs
					css={styles.tabPanel}
					orientation="vertical"
					variant="scrollable"
					selectionFollowsFocus
					value={activeExplorerId}
					onChange={(_, newValue) => setActiveExplorerId(newValue)}
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
				<Box
					css={[
						commonStyles.overlayContainer,
						commonStyles.fullHeight,
						commonStyles.flex.shrinkAndFitHorizontal,
					]}
				>
					{Object.keys(explorers).map((explorerId) => (
						<TabPanel key={explorerId} value={activeExplorerId} index={explorerId}>
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

const TabPanel: React.FC<TabPanelProps> = (props) => {
	const { value, index, children } = props;

	return (
		<Box
			css={[
				commonStyles.overlayChild,
				commonStyles.fullHeight,
				commonStyles.fullWidth,
				value !== index ? commonStyles.transparent : undefined,
			]}
		>
			{children}
		</Box>
	);
};
