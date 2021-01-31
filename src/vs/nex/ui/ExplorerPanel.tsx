import * as React from 'react';
import { Box, Chip, Divider } from '@material-ui/core';
import { matchSorter } from 'match-sorter';

import { styles } from 'vs/nex/ui/ExplorerPanel.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { DataTable } from 'vs/nex/ui/elements/DataTable';
import { PasteProcess } from 'vs/nex/ui/PasteProcess';
import {
	FileForUI,
	useFileProviderFiles,
	useFileProviderPasteProcesses,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useFileActions } from 'vs/nex/platform/file.hooks';
import { useExplorerActions } from 'vs/nex/platform/explorer.hooks';
import { FILE_TYPE } from 'vs/nex/platform/file-types';
import { horizontalScrollProps } from 'vs/nex/ui/utils/ui.util';
import { strings } from 'vs/nex/base/utils/strings.util';
import { arrays } from 'vs/nex/base/utils/arrays.util';
import { formatter } from 'vs/nex/base/utils/formatter.util';
import { ExplorerActions } from 'vs/nex/ui/ExplorerActions';
import { PanelActions } from 'vs/nex/ui/PanelActions';

export const ExplorerPanel: React.FC<{ explorerId: string }> = ({ explorerId }) => {
	const files = useFileProviderFiles(explorerId);
	const pasteProcesses = useFileProviderPasteProcesses();

	const fileActions = useFileActions();
	const explorerActions = useExplorerActions(explorerId);

	const [idsOfSelectedFiles, setIdsOfSelectedFiles] = React.useState<string[]>([]);
	const [filterInput, setFilterInput] = React.useState('');

	const selectedFiles = files.filter((file) => !!idsOfSelectedFiles.find((id) => id === file.id));

	/*
	 * Compute files to show:
	 * - if no filter input is given, just sort the files.
	 *   Directories first and files second. Each section sorted by name.
	 * - otherwise, let "match-sorter" do its job for filtering and sorting.
	 */
	let filesToShow: FileForUI[] = files.map((file) => ({
		...file,
		tags:
			file.ctime === undefined
				? []
				: fileActions.getTagsOfFile({ uri: file.uri, ctime: file.ctime }),
	}));
	if (strings.isNullishOrEmpty(filterInput)) {
		filesToShow = arrays
			.wrap(filesToShow)
			.stableSort((a, b) => {
				if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
					return -1;
				} else if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
					return 1;
				}
				return 0;
			})
			.stableSort((a, b) => {
				if (a.fileType === FILE_TYPE.DIRECTORY && b.fileType === FILE_TYPE.FILE) {
					return -1;
				} else if (a.fileType === FILE_TYPE.FILE && b.fileType === FILE_TYPE.DIRECTORY) {
					return 1;
				}
				return 0;
			})
			.getValue();
	} else {
		filesToShow = arrays
			.wrap(filesToShow)
			.matchSort(filterInput, {
				// avoid "WORD STARTS WITH" ranking of match-sorter by replacing each blank with another character
				keys: [(file) => file.name.replace(' ', '_')],
				threshold: matchSorter.rankings.CONTAINS,
			})
			.getValue();
	}

	const rowsToShow = filesToShow.map((fileToShow) => ({
		id: fileToShow.id,
		data: fileToShow,
		selected: !!selectedFiles.find((file) => file.id === fileToShow.id),
	}));

	return (
		<Stack css={commonStyles.fullHeight} direction="column" alignItems="stretch" stretchContainer>
			<Stack css={styles.explorerSection}>
				<PanelActions
					explorerId={explorerId}
					filesToShow={filesToShow}
					idsOfSelectedFiles={idsOfSelectedFiles}
					setIdsOfSelectedFiles={setIdsOfSelectedFiles}
					filterInput={filterInput}
					setFilterInput={setFilterInput}
				/>
				<Divider orientation="vertical" flexItem />
				<ExplorerActions selectedFiles={selectedFiles} />
			</Stack>
			<Box
				css={[
					styles.explorerSection,
					commonStyles.fullHeight,
					commonStyles.flex.shrinkAndFitVertical,
				]}
			>
				<DataTable
					rows={rowsToShow}
					headCells={[
						{
							label: 'Name',
							format: (row) => (
								<Stack
									css={styles.fileIcon}
									className={row.iconClasses.join(' ')}
									alignItems="center"
								>
									<Box component="span">{formatFileName(row)}</Box>
									{row.tags.map((tag) => (
										<Chip
											key={tag.id}
											style={{ backgroundColor: tag.colorHex }}
											variant="outlined"
											size="small"
											label={tag.name}
											onDelete={() => fileActions.removeTags([row.uri], [tag.id])}
										/>
									))}
								</Stack>
							),
						},
						{
							label: 'Size',
							format: (row) => {
								if (row.fileType !== FILE_TYPE.FILE || row.size === undefined) {
									return;
								}

								return formatter.bytes(row.size);
							},
						},
					]}
					onRowClick={(row) => setIdsOfSelectedFiles([row.id])}
					onRowDoubleClick={(row) => {
						if (row.fileType === FILE_TYPE.DIRECTORY) {
							explorerActions.changeDirectory(row.uri.path);
						} else if (row.fileType === FILE_TYPE.FILE) {
							fileActions.openFile(row.uri);
						}
					}}
				/>
			</Box>
			{pasteProcesses.length > 0 && (
				<Box {...horizontalScrollProps}>
					<Stack css={[styles.processesArea, commonStyles.flex.disableShrinkChildren]} spacing={2}>
						{pasteProcesses.map((process) => (
							<PasteProcess key={process.id} process={process} />
						))}
					</Stack>
				</Box>
			)}
		</Stack>
	);
};

function formatFileName(file: FileForUI): string {
	if (file.extension === undefined) {
		return file.name;
	}

	return `${file.name}${file.extension}`;
}
