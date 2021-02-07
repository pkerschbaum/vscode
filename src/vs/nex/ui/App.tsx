import * as React from 'react';
import { Box, Tabs, Tab, Button, IconButton, Tooltip } from '@material-ui/core';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';

import { URI } from 'vs/base/common/uri';

import { styles } from 'vs/nex/ui/App.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { ExplorerPanel } from 'vs/nex/ui/ExplorerPanel';
import { PasteProcess } from 'vs/nex/ui/PasteProcess';
import { DeleteProcess } from 'vs/nex/ui/DeleteProcess';
import {
	useFileProviderCwd,
	useFileProviderExplorers,
	useFileProviderFocusedExplorerId,
	useFileProviderProcesses,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useAppActions } from 'vs/nex/platform/app.hooks';
import { KEYS } from 'vs/nex/ui/constants';
import { useWindowEvent } from 'vs/nex/ui/utils/events.hooks';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { assertUnreachable } from 'vs/nex/base/utils/types.util';

export const App: React.FC = () => {
	const explorers = useFileProviderExplorers();
	const focusedExplorerId = useFileProviderFocusedExplorerId();
	const processes = useFileProviderProcesses();

	const appActions = useAppActions();

	// on mount, add first (initial) explorer panel
	React.useEffect(() => {
		appActions.addExplorerPanel();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function switchFocusedExplorer(direction: 'UP' | 'DOWN') {
		const focusedExplorerIdx = explorers.findIndex(
			(explorer) => explorer.explorerId === focusedExplorerId,
		);

		if (
			focusedExplorerIdx === -1 ||
			(direction === 'UP' && focusedExplorerIdx === 0) ||
			(direction === 'DOWN' && focusedExplorerIdx === explorers.length - 1)
		) {
			return;
		}

		const explorerIdxToSwitchTo =
			direction === 'UP' ? focusedExplorerIdx - 1 : focusedExplorerIdx + 1;

		appActions.changeFocusedExplorer(explorers[explorerIdxToSwitchTo].explorerId);
	}

	useWindowEvent('keydown', [
		{
			condition: (e) => e.ctrlKey && e.key === KEYS.PAGE_UP,
			handler: () => switchFocusedExplorer('UP'),
		},
		{
			condition: (e) => e.ctrlKey && e.key === KEYS.PAGE_DOWN,
			handler: () => switchFocusedExplorer('DOWN'),
		},
	]);

	const explorersToShow = explorers.filter((explorer) => !explorer.scheduledToRemove);
	const removeExplorerActionDisabled = explorersToShow.length < 2;

	return (
		<Box className="show-file-icons" css={[styles.container, commonStyles.fullHeight]}>
			<Stack css={styles.tabsArea} direction="column" alignItems="stretch">
				<Tabs
					css={styles.tabsPanel}
					orientation="vertical"
					variant="scrollable"
					value={focusedExplorerId}
					onChange={(_, newValue) => appActions.changeFocusedExplorer(newValue)}
				>
					{explorersToShow.map((explorer) => (
						<Tab
							key={explorer.explorerId}
							css={[styles.tab]}
							component="div"
							label={
								<Stack css={commonStyles.fullWidth} justifyContent="space-between">
									<Box component="span">
										{uriHelper.extractNameAndExtension(explorer.cwd).fileName}
									</Box>
									<Tooltip
										title={removeExplorerActionDisabled ? '' : 'Remove Tab'}
										disableInteractive
									>
										<Box component="span">
											<IconButton
												disabled={removeExplorerActionDisabled}
												style={{ padding: 8 }}
												onClick={() => {
													appActions.removeExplorerPanel(explorer.explorerId);
												}}
											>
												<RemoveCircleOutlineIcon />
											</IconButton>
										</Box>
									</Tooltip>
								</Stack>
							}
							value={explorer.explorerId}
						/>
					))}
				</Tabs>
				<Button onClick={appActions.addExplorerPanel}>Add Tab</Button>
			</Stack>

			<Box
				css={[
					styles.activeExplorerArea,
					commonStyles.fullHeight,
					commonStyles.flex.shrinkAndFitHorizontal,
				]}
			>
				{focusedExplorerId !== undefined &&
					explorersToShow.map(({ explorerId }) => (
						<TabPanel key={explorerId} value={focusedExplorerId} index={explorerId}>
							<ExplorerPanelContainer explorerId={explorerId} />
						</TabPanel>
					))}
			</Box>

			{processes.length > 0 && (
				<Stack css={[styles.processesArea, commonStyles.flex.disableShrinkChildren]} spacing={2}>
					{processes.map((process) =>
						process.type === 'paste' ? (
							<PasteProcess key={process.id} process={process} />
						) : process.type === 'delete' ? (
							<DeleteProcess key={process.id} process={process} />
						) : (
							assertUnreachable(process)
						),
					)}
				</Stack>
			)}
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
