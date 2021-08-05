import * as React from 'react';
import { Box, Chip, Divider, TextField } from '@material-ui/core';
import { matchSorter } from 'match-sorter';

import { styles } from 'vs/nex/ui/ExplorerPanel.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { Cell } from 'vs/nex/ui/elements/DataTable/Cell';
import { DataTable } from 'vs/nex/ui/elements/DataTable/DataTable';
import { HeadCell } from 'vs/nex/ui/elements/DataTable/HeadCell';
import { Row } from 'vs/nex/ui/elements/DataTable/Row';
import { TableBody } from 'vs/nex/ui/elements/DataTable/TableBody';
import { TableHead } from 'vs/nex/ui/elements/DataTable/TableHead';
import {
	FileForUI,
	useFileProviderFiles,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useFileActions } from 'vs/nex/platform/file.hooks';
import { useExplorerActions } from 'vs/nex/platform/explorer.hooks';
import { FILE_TYPE } from 'vs/nex/platform/file-types';
import { KEYS } from 'vs/nex/ui/constants';
import { strings } from 'vs/nex/base/utils/strings.util';
import { arrays } from 'vs/nex/base/utils/arrays.util';
import { formatter } from 'vs/nex/base/utils/formatter.util';
import { ExplorerActions } from 'vs/nex/ui/ExplorerActions';
import { PanelActions } from 'vs/nex/ui/PanelActions';

export const ExplorerPanel: React.FC<{ explorerId: string }> = ({ explorerId }) => {
	const files = useFileProviderFiles(explorerId);

	const fileActions = useFileActions();
	const explorerActions = useExplorerActions(explorerId);

	const [idsOfSelectedFiles, setIdsOfSelectedFiles] = React.useState<string[]>([]);
	const [filterInput, setFilterInput] = React.useState('');
	const [fileToRenameId, setFileToRenameId] = React.useState<string | undefined>();

	const selectedFiles = files.filter((file) => !!idsOfSelectedFiles.find((id) => id === file.id));
	let fileToRename: FileForUI | undefined;
	if (fileToRenameId) {
		fileToRename = files.find((file) => file.id === fileToRenameId);
	}

	const openSelectedFiles = () => {
		if (selectedFiles.length === 1 && selectedFiles[0].fileType === FILE_TYPE.DIRECTORY) {
			explorerActions.changeDirectory(selectedFiles[0].uri.path);
		} else {
			selectedFiles
				.filter((selectedFile) => selectedFile.fileType === FILE_TYPE.FILE)
				.forEach((selectedFile) => fileActions.openFile(selectedFile.uri));
		}
	};

	const scheduleDeleteSelectedFiles = () => {
		fileActions.scheduleMoveFilesToTrash(selectedFiles.map((file) => file.uri));
	};

	const cutOrCopySelectedFiles = (cut: boolean) => () => {
		return fileActions.cutOrCopyFiles(
			selectedFiles.map((file) => file.uri),
			cut,
		);
	};
	const copySelectedFiles = cutOrCopySelectedFiles(false);
	const cutSelectedFiles = cutOrCopySelectedFiles(true);

	const triggerRenameForSelectedFiles = () => {
		if (selectedFiles.length !== 1) {
			return;
		}
		setFileToRenameId(selectedFiles[0].id);
	};

	const fileEditActions = {
		openSelectedFiles,
		scheduleDeleteSelectedFiles,
		copySelectedFiles,
		cutSelectedFiles,
		triggerRenameForSelectedFiles,
	};

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

	function abortRename() {
		setFileToRenameId(undefined);
	}

	return (
		<Stack css={commonStyles.fullHeight} direction="column" alignItems="stretch" stretchContainer>
			<Stack>
				<PanelActions
					explorerId={explorerId}
					filesToShow={filesToShow}
					idsOfSelectedFiles={idsOfSelectedFiles}
					setIdsOfSelectedFiles={setIdsOfSelectedFiles}
					filterInput={filterInput}
					setFilterInput={setFilterInput}
					{...fileEditActions}
				/>
				<Divider orientation="vertical" flexItem />
				<ExplorerActions selectedFiles={selectedFiles} {...fileEditActions} />
			</Stack>

			<Box css={[commonStyles.fullHeight, commonStyles.flex.shrinkAndFitVertical]}>
				<DataTable>
					<TableHead>
						<HeadCell>Name</HeadCell>
						<HeadCell>Size</HeadCell>
					</TableHead>

					{filesToShow.length > 0 && (
						<TableBody>
							{filesToShow.map((fileToShow) => {
								const selected = !!selectedFiles.find((file) => file.id === fileToShow.id);

								function selectRow() {
									setIdsOfSelectedFiles([fileToShow.id]);
								}

								function openFileOrDirectory() {
									if (fileToShow.fileType === FILE_TYPE.DIRECTORY) {
										explorerActions.changeDirectory(fileToShow.uri.path);
									} else {
										fileActions.openFile(fileToShow.uri);
									}
								}

								async function renameFile(newName: string) {
									await fileActions.renameFile(fileToShow.uri, newName);
									setFileToRenameId(undefined);
								}

								return (
									<Row
										key={fileToShow.id}
										onClick={selectRow}
										onDoubleClick={openFileOrDirectory}
										selected={selected}
									>
										<Cell>
											<Stack
												css={styles.fileIcon}
												className={fileToShow.iconClasses.join(' ')}
												alignItems="center"
											>
												{fileToRename && fileToRename.id === fileToShow.id ? (
													<RenameInput
														file={fileToShow}
														onSubmit={renameFile}
														abortRename={abortRename}
													/>
												) : (
													<Box component="span">{formatter.file(fileToShow)}</Box>
												)}
												{fileToShow.tags.map((tag) => (
													<Chip
														key={tag.id}
														style={{ backgroundColor: tag.colorHex }}
														variant="outlined"
														size="small"
														label={tag.name}
														onDelete={() => fileActions.removeTags([fileToShow.uri], [tag.id])}
													/>
												))}
											</Stack>
										</Cell>
										<Cell>
											{fileToShow.fileType === FILE_TYPE.FILE &&
												fileToShow.size !== undefined &&
												formatter.bytes(fileToShow.size)}
										</Cell>
									</Row>
								);
							})}
						</TableBody>
					)}
				</DataTable>
			</Box>
		</Stack>
	);
};

type RenameInputProps = {
	file: FileForUI;
	onSubmit: (newName: string) => void;
	abortRename: () => void;
};

const RenameInput: React.FC<RenameInputProps> = ({ file, onSubmit, abortRename }) => {
	const [value, setValue] = React.useState(formatter.file(file));

	return (
		<form
			css={commonStyles.fullWidth}
			onSubmit={() => onSubmit(value)}
			onBlur={abortRename}
			onKeyDown={(e) => {
				if (e.key === KEYS.ESC) {
					abortRename();
				}
			}}
		>
			<TextField
				fullWidth
				autoFocus
				label="Rename"
				value={value}
				onChange={(e) => setValue(e.target.value)}
			/>
		</form>
	);
};
