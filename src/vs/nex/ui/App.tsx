import * as React from 'react';
import { Box, Tabs, Tab, Button } from '@material-ui/core';

import { URI } from 'vs/base/common/uri';

import { styles } from 'vs/nex/ui/App.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { ExplorerPanel } from 'vs/nex/ui/ExplorerPanel';
import { dispatch } from 'vs/nex/platform/store/store';
import {
	actions as fileProviderActions,
	generateExplorerId,
} from 'vs/nex/platform/store/file-provider/file-provider.slice';
import {
	useFileProviderCwd,
	useFileProviderExplorers,
	useFileProviderFocusedExplorerId,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useAppActions } from 'vs/nex/platform/app.hooks';
import { mapFileStatToFile, NexFileSystem } from 'vs/nex/platform/logic/file-system';
import { useNexFileSystem } from 'vs/nex/NexFileSystem.provider';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { RESOURCES_SCHEME } from 'vs/nex/platform/file-types';

export const App: React.FC = () => {
	const explorers = useFileProviderExplorers();
	const focusedExplorerId = useFileProviderFocusedExplorerId();
	const appActions = useAppActions();

	const fileSystem = useNexFileSystem();

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
					<Button onClick={() => addExplorerPanel(fileSystem)}>Add Tab</Button>
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

export async function addExplorerPanel(fileSystem: NexFileSystem) {
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
		fileProviderActions.addExplorer({
			explorerId,
			cwd: parsedUri.toJSON(),
		}),
	);
	dispatch(
		fileProviderActions.changeCwd({
			explorerId,
			newCwd: parsedUri.toJSON(),
			files: children.map(mapFileStatToFile),
		}),
	);
}
