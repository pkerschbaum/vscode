import * as React from 'react';
import {
	Autocomplete,
	Box,
	Button,
	Chip,
	createFilterOptions,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Paper,
	TextField,
	useTheme,
} from '@material-ui/core';
import { matchSorter } from 'match-sorter';
import { css } from '@emotion/react';

import { URI } from 'vs/base/common/uri';

import { styles } from 'vs/nex/ui/App.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { DataTable } from 'vs/nex/ui/elements/DataTable';
import { LinearProgress } from 'vs/nex/ui/elements/LinearProgress';
import {
	FileForUI,
	useFileProviderState,
	useFileProviderThunks,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useTagsActions } from 'vs/nex/platform/tags.hooks';
import { FILE_TYPE, PasteProcess, PASTE_STATUS, Tag } from 'vs/nex/platform/file-types';
import { KEYS, MOUSE_BUTTONS } from 'vs/nex/ui/constants';
import { useWindowEvent, usePrevious } from 'vs/nex/ui/utils/events.hooks';
import { horizontalScrollProps } from 'vs/nex/ui/utils/ui.util';
import { strings } from 'vs/nex/base/utils/strings.util';
import { functions } from 'vs/nex/base/utils/functions.util';
import { arrays } from 'vs/nex/base/utils/arrays.util';
import { formatter } from 'vs/nex/base/utils/formatter.util';
import { byteSize } from 'vs/nex/base/utils/byte-size.util';
import { assertUnreachable } from 'vs/nex/base/utils/types.util';

const EXPLORER_FILTER_INPUT_ID = 'explorer-filter-input';

export const App: React.FC = () => {
	const { cwd } = useFileProviderState();

	return (
		<Stack
			className="show-file-icons"
			css={[styles.container, commonStyles.fullHeight]}
			direction="column"
			alignItems="stretch"
			stretchContainer
		>
			<Explorer key={URI.from(cwd).toString()} />
		</Stack>
	);
};

const Explorer: React.FC = () => {
	const { cwd, files, draftPasteState, pasteProcesses } = useFileProviderState();
	const fileProviderThunks = useFileProviderThunks();
	const tagActions = useTagsActions();

	const [cwdInput, setCwdInput] = React.useState(cwd.path);
	const [idsOfSelectedFiles, setIdsOfSelectedFiles] = React.useState<string[]>([]);
	const [filterInput, setFilterInput] = React.useState('');
	const filterInputRef = React.useRef<HTMLDivElement>(null);

	const selectedFiles = files.filter((file) => !!idsOfSelectedFiles.find((id) => id === file.id));

	/*
	 * Compute files to show:
	 * - if no filter input is given, just sort the files.
	 *   Directories first and files second. Each section sorted by name.
	 * - otherwise, let "match-sorter" do its job for filtering and sorting.
	 */
	let filesToShow: FileForUI[] = files.map((file) => ({
		...file,
		tags: fileProviderThunks.getTagsOfFile(file.uri),
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

	// on mount, and every time the filter input changes, reset selection (select just the first file)
	const prevFilterInput = usePrevious(filterInput);
	React.useEffect(() => {
		if (filterInput !== prevFilterInput && rowsToShow.length > 0) {
			setIdsOfSelectedFiles([rowsToShow[0].id]);
		}
	}, [filterInput, prevFilterInput, rowsToShow]);

	function navigateUp() {
		fileProviderThunks.changeDirectory(URI.joinPath(URI.from(cwd), '..').path);
	}

	const openSelectedFiles = () => {
		if (selectedFiles.length === 1 && selectedFiles[0].fileType === FILE_TYPE.DIRECTORY) {
			fileProviderThunks.changeDirectory(selectedFiles[0].uri.path);
		} else {
			selectedFiles
				.filter((selectedFile) => selectedFile.fileType === FILE_TYPE.FILE)
				.forEach((selectedFile) => fileProviderThunks.openFile(selectedFile.uri));
		}
	};

	const deleteSelectedFiles = async () => {
		await fileProviderThunks.moveFilesToTrash(selectedFiles.map((file) => file.uri));
	};

	const cutOrCopySelectedFiles = (cut: boolean) => () => {
		return fileProviderThunks.cutOrCopyFiles(
			selectedFiles.map((file) => file.uri),
			cut,
		);
	};
	const copySelectedFiles = cutOrCopySelectedFiles(false);
	const cutSelectedFiles = cutOrCopySelectedFiles(true);

	/**
	 * - If no file is selected, select the first file
	 * - If at least one file is selected,
	 * -- and arrow up is pressed, select the file above the first currently selected file (if file above exists)
	 * -- and arrow down is pressed, select the file below the first currently selected file (if file below exists)
	 */
	const changeSelectedFile = (
		key: KEYS['ARROW_UP'] | KEYS['ARROW_DOWN'] | KEYS['PAGE_UP'] | KEYS['PAGE_DOWN'],
	) => {
		if (filesToShow.length < 1) {
			return;
		}

		if (key === KEYS.ARROW_UP || key === KEYS.ARROW_DOWN) {
			const firstSelectedFileIndex = filesToShow.findIndex((file) =>
				selectedFiles.some((selectedFile) => selectedFile.id === file.id),
			);
			if (selectedFiles.length === 0) {
				setIdsOfSelectedFiles([filesToShow[0].id]);
			} else if (key === KEYS.ARROW_UP && firstSelectedFileIndex > 0) {
				setIdsOfSelectedFiles([filesToShow[firstSelectedFileIndex - 1].id]);
			} else if (key === KEYS.ARROW_DOWN && filesToShow.length > firstSelectedFileIndex + 1) {
				setIdsOfSelectedFiles([filesToShow[firstSelectedFileIndex + 1].id]);
			}
		} else if (key === KEYS.PAGE_UP) {
			setIdsOfSelectedFiles([filesToShow[0].id]);
		} else if (key === KEYS.PAGE_DOWN) {
			setIdsOfSelectedFiles([filesToShow[filesToShow.length - 1].id]);
		} else {
			assertUnreachable(key);
		}
	};

	useWindowEvent('keydown', [
		/* These handlers allow navigation of the directory content. If the user did type in any
		 * input field other than the filter input, don't execute any navigation handler.
		 */
		{
			condition: (e) =>
				e.target instanceof HTMLInputElement && e.target.id !== EXPLORER_FILTER_INPUT_ID,
			handler: functions.noop,
		},
		{ condition: (e) => e.ctrlKey && e.key === KEYS.C, handler: copySelectedFiles },
		{ condition: (e) => e.ctrlKey && e.key === KEYS.X, handler: cutSelectedFiles },
		{ condition: (e) => e.ctrlKey && e.key === KEYS.V, handler: fileProviderThunks.pasteFiles },
		{ condition: (e) => e.key === KEYS.ARROW_UP, handler: () => changeSelectedFile(KEYS.ARROW_UP) },
		{
			condition: (e) => e.key === KEYS.ARROW_DOWN,
			handler: () => changeSelectedFile(KEYS.ARROW_DOWN),
		},
		{ condition: (e) => e.key === KEYS.PAGE_UP, handler: () => changeSelectedFile(KEYS.PAGE_UP) },
		{
			condition: (e) => e.key === KEYS.PAGE_DOWN,
			handler: () => changeSelectedFile(KEYS.PAGE_DOWN),
		},
		{ condition: (e) => e.key === KEYS.ENTER, handler: openSelectedFiles },
		{ condition: (e) => e.key === KEYS.DELETE, handler: deleteSelectedFiles },
		{ condition: (e) => e.altKey && e.key === KEYS.ARROW_LEFT, handler: navigateUp },
		{
			condition: (e) =>
				e.key !== KEYS.BACKSPACE && !e.altKey && !e.ctrlKey && filterInputRef.current !== null,
			handler: () => {
				if (filterInputRef.current !== null) {
					filterInputRef.current.focus();
				}
			},
		},
	]);

	useWindowEvent('auxclick', [
		{ condition: (e) => e.button === MOUSE_BUTTONS.BACK, handler: navigateUp },
	]);

	const singleFileActionsDisabled = selectedFiles.length !== 1;
	const multipleFilesActionsDisabled = selectedFiles.length < 1;
	const multipleDirectoriesActionsDisabled =
		selectedFiles.length < 1 || selectedFiles.some((file) => file.fileType !== FILE_TYPE.DIRECTORY);

	return (
		<>
			<Stack>
				<Stack>
					<TextField
						id={EXPLORER_FILTER_INPUT_ID}
						inputRef={filterInputRef}
						InputLabelProps={{ shrink: true }}
						onKeyDown={(e) => {
							/*
							 * For some keys, the default action should be stopped (e.g. in case of ARROW_UP and
							 * ARROW_DOWN, the cursor in the input field jumps to the start/end of the field). The event
							 * must get propagated to the parent, this is needed for navigating the files using the
							 * keyboard. For all other events, we stop propagation to avoid interference with the
							 * keyboard navigation (e.g. CTRL+X would not only cut the text of the input field, but
							 * also the files currently selected)
							 */
							if (
								e.ctrlKey ||
								e.altKey ||
								e.key === KEYS.ARROW_UP ||
								e.key === KEYS.ARROW_DOWN ||
								e.key === KEYS.PAGE_UP ||
								e.key === KEYS.PAGE_DOWN ||
								e.key === KEYS.ENTER
							) {
								e.preventDefault();
							}
						}}
						label="Filter"
						value={filterInput}
						onChange={(e) => {
							const newVal = e.target.value.trimStart();
							setFilterInput(newVal);
							if (newVal === '' && filterInputRef.current !== null) {
								filterInputRef.current.blur();
							}
						}}
					/>
				</Stack>
				<Divider orientation="vertical" flexItem />
				<Stack css={[commonStyles.flex.disableShrink, commonStyles.flex.disableShrinkChildren]}>
					<TextField
						label="Current Directory"
						value={cwdInput}
						onChange={(e) => setCwdInput(e.target.value)}
					/>
					<Button onClick={() => fileProviderThunks.changeDirectory(cwdInput)}>Change CWD</Button>
					<Button onClick={navigateUp}>Up</Button>
				</Stack>
				<Divider orientation="vertical" flexItem />
				<Stack wrap>
					<Button onClick={openSelectedFiles} disabled={singleFileActionsDisabled}>
						Open
					</Button>
					<Button onClick={copySelectedFiles} disabled={multipleFilesActionsDisabled}>
						Copy
					</Button>
					<Button onClick={cutSelectedFiles} disabled={multipleFilesActionsDisabled}>
						Cut
					</Button>
					<Button
						variant={draftPasteState === undefined ? 'outlined' : 'contained'}
						onClick={fileProviderThunks.pasteFiles}
						disabled={draftPasteState === undefined}
					>
						Paste
					</Button>
					<Button onClick={deleteSelectedFiles} disabled={multipleFilesActionsDisabled}>
						Delete
					</Button>
					<AddTag
						options={Object.entries(tagActions.getTags()).map(([id, otherValues]) => ({
							...otherValues,
							id,
						}))}
						onValueCreated={(tag) => tagActions.addTag(tag)}
						onValueChosen={(chosenTag) => {
							fileProviderThunks.addTags(
								selectedFiles.map((file) => file.uri),
								[chosenTag.id],
							);
						}}
						disabled={multipleDirectoriesActionsDisabled}
					/>
				</Stack>
			</Stack>
			<Box css={(commonStyles.fullHeight, commonStyles.flex.shrinkAndFitVertical)}>
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
											onDelete={() => fileProviderThunks.removeTags([row.uri], [tag.id])}
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
							fileProviderThunks.changeDirectory(row.uri.path);
						} else if (row.fileType === FILE_TYPE.FILE) {
							fileProviderThunks.openFile(row.uri);
						}
					}}
				/>
			</Box>
			{pasteProcesses.length > 0 && (
				<Box {...horizontalScrollProps}>
					<Stack css={[styles.processesArea, commonStyles.flex.disableShrinkChildren]} spacing={2}>
						{pasteProcesses.map((process) => (
							<PasteProcessEntry key={process.id} process={process} />
						))}
					</Stack>
				</Box>
			)}
		</>
	);
};

// derived from https://material-ui.com/components/autocomplete/#creatable
type WithInput<T> = T & {
	inputValue?: string;
};

const autocompleteDefaultFilter = createFilterOptions<WithInput<Tag>>();

const AddTag: React.FC<{
	options: Tag[];
	onValueCreated: (value: Omit<Tag, 'id'>) => Tag;
	onValueChosen: (value: Tag) => void;
	disabled?: boolean;
}> = ({ options, onValueCreated, onValueChosen, disabled }) => {
	const { availableTagColors } = useTheme();
	const defaultTag = {
		inputValue: '',
		name: '',
		colorHex: availableTagColors[0],
		id: 'add-tag-action',
	};

	const [open, toggleOpen] = React.useState(false);
	const [dialogValue, setDialogValue] = React.useState<WithInput<Omit<Tag, 'id'>>>(defaultTag);

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!strings.isNullishOrEmpty(dialogValue.name)) {
			const tag = onValueCreated(dialogValue);
			onValueChosen(tag);
		}
		handleClose();
	}

	function handleClose() {
		setDialogValue(defaultTag);
		toggleOpen(false);
	}

	return (
		<React.Fragment>
			<Autocomplete
				css={styles.tagAutocomplete}
				disabled={disabled}
				value={null as WithInput<Tag> | null}
				onChange={(_, newValue) => {
					if (typeof newValue === 'string') {
						toggleOpen(true);
						setDialogValue({
							name: newValue,
							colorHex: availableTagColors[0],
						});
					} else if (newValue && newValue.inputValue) {
						toggleOpen(true);
						setDialogValue({
							name: newValue.inputValue,
							colorHex: availableTagColors[0],
						});
					} else if (newValue !== null) {
						onValueChosen(newValue);
					}
				}}
				filterOptions={(options, params) => {
					const filtered = autocompleteDefaultFilter(options, params);

					if (!strings.isNullishOrEmpty(params.inputValue)) {
						filtered.push({
							inputValue: params.inputValue,
							name: `Add "${params.inputValue}"`,
							colorHex: availableTagColors[0],
							id: 'add-tag-action',
						});
					}

					return filtered;
				}}
				options={options as WithInput<Tag>[]}
				getOptionLabel={(option) => {
					if (typeof option === 'string') {
						return option;
					}
					if (option.inputValue) {
						return option.inputValue;
					}
					return option.name;
				}}
				freeSolo
				selectOnFocus
				clearOnBlur
				handleHomeEndKeys
				renderOption={(props, option) => (
					<li {...props}>
						<Stack>
							{strings.isNullishOrEmpty(option.inputValue) && (
								<Button
									css={styles.colorButton}
									disableElevation
									variant="contained"
									style={{ backgroundColor: option.colorHex }}
								/>
							)}
							<span>{option.name}</span>
						</Stack>
					</li>
				)}
				renderInput={(params) => <TextField {...params} label="Add Tag" />}
			/>
			<Dialog open={open} onClose={handleClose}>
				<form onSubmit={handleSubmit}>
					<DialogTitle>Add a new tag</DialogTitle>
					<DialogContent>
						<Stack direction="column" alignItems="start">
							<Stack>
								<Button
									css={styles.colorButton}
									disableElevation
									variant="contained"
									style={{ backgroundColor: dialogValue.colorHex }}
								/>
								<TextField
									css={styles.tagNameInput}
									autoFocus
									margin="none"
									label="Name of tag"
									value={dialogValue.name}
									onChange={(event) =>
										setDialogValue({
											...dialogValue,
											name: event.target.value.trim(),
										})
									}
								/>
							</Stack>
							<Paper
								variant="outlined"
								css={(theme) =>
									css`
										padding: ${theme.spacing()};
									`
								}
							>
								<Stack direction="column" alignItems="start">
									{arrays
										.partitionArray(availableTagColors, { itemsPerPartition: 5 })
										.map((partition, idx) => (
											<Stack key={idx}>
												{partition.map((colorHex) => {
													const isSelected = dialogValue.colorHex === colorHex;
													return (
														<Button
															key={colorHex}
															css={styles.colorButton}
															style={{
																backgroundColor: colorHex,
																opacity: isSelected ? '0.35' : undefined,
															}}
															disableRipple
															disableElevation
															variant={isSelected ? 'outlined' : 'contained'}
															onClick={() => setDialogValue({ ...dialogValue, colorHex })}
														/>
													);
												})}
											</Stack>
										))}
								</Stack>
							</Paper>
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button variant="text" onClick={handleClose}>
							Cancel
						</Button>
						<Button variant="text" type="submit">
							Add
						</Button>
					</DialogActions>
				</form>
			</Dialog>
		</React.Fragment>
	);
};

const PasteProcessEntry: React.FC<{ process: PasteProcess }> = ({ process }) => {
	const smallestUnitOfTotalSize = byteSize.probe(process.totalSize).unit;

	return (
		<Stack key={process.id} direction="column" alignItems="stretch">
			<Box>Destination: {URI.from(process.destinationFolder).fsPath}</Box>
			<Box>{formatter.bytes(process.bytesProcessed, { unit: smallestUnitOfTotalSize })}</Box>
			<Box>{formatter.bytes(process.totalSize, { unit: smallestUnitOfTotalSize })}</Box>
			<Box>{process.status}</Box>
			<LinearProgress
				value={
					process.status === PASTE_STATUS.FINISHED
						? 100
						: (process.bytesProcessed / process.totalSize) * 100
				}
				showLabel
			/>
		</Stack>
	);
};

function formatFileName(file: FileForUI): string {
	if (file.extension === undefined) {
		return file.name;
	}

	return `${file.name}.${file.extension}`;
}
