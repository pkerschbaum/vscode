import * as React from 'react';
import { Box, Button, Divider, TextField } from '@material-ui/core';
import { matchSorter } from 'match-sorter';

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
import { FILE_TYPE, PasteProcess, PASTE_STATUS } from 'vs/nex/platform/file-types';
import { KEYS } from 'vs/nex/ui/constants';
import { DEFAULT_KEYDOWN_HANDLER, useKeydownHandler } from 'vs/nex/ui/utils/events.hooks';
import { horizontalScrollProps } from 'vs/nex/ui/utils/ui.util';
import { arrays } from 'vs/nex/base/utils/arrays.util';
import { strings } from 'vs/nex/base/utils/strings.util';
import { formatter } from 'vs/nex/base/utils/formatter.util';
import { byteSize } from 'vs/nex/base/utils/byte-size.util';
import { assertUnreachable } from 'vs/nex/base/utils/types.util';

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
	let filesToShow: FileForUI[];
	if (strings.isNullishOrEmpty(filterInput)) {
		filesToShow = arrays
			.wrap(files)
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
			.wrap(files)
			.matchSort(filterInput, {
				// avoid "WORD STARTS WITH" ranking of match-sorter by replacing each blank with another character
				keys: [(file) => file.name.replace(' ', '_')],
				threshold: matchSorter.rankings.CONTAINS,
			})
			.getValue();
	}

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
				selectedFiles.some((selectedFile) => selectedFile === file),
			);
			if (selectedFiles.length === 0) {
				setIdsOfSelectedFiles([filesToShow[0].id]);
			} else if (key === KEYS.ARROW_UP && firstSelectedFileIndex !== 0) {
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

	useKeydownHandler({
		[KEYS.C]: {
			additionalKeys: ['CTRL'],
			handler: copySelectedFiles,
		},
		[KEYS.X]: {
			additionalKeys: ['CTRL'],
			handler: cutSelectedFiles,
		},
		[KEYS.V]: {
			additionalKeys: ['CTRL'],
			handler: fileProviderThunks.pasteFiles,
		},
		[KEYS.ARROW_UP]: () => changeSelectedFile(KEYS.ARROW_UP),
		[KEYS.ARROW_DOWN]: () => changeSelectedFile(KEYS.ARROW_DOWN),
		[KEYS.PAGE_UP]: () => changeSelectedFile(KEYS.PAGE_UP),
		[KEYS.PAGE_DOWN]: () => changeSelectedFile(KEYS.PAGE_DOWN),
		[KEYS.ENTER]: openSelectedFiles,
		[KEYS.DELETE]: deleteSelectedFiles,
		[KEYS.ARROW_LEFT]: { additionalKeys: ['ALT'], handler: navigateUp },
		[DEFAULT_KEYDOWN_HANDLER]: (e) => {
			if (e.key !== KEYS.BACKSPACE && !e.altKey && !e.ctrlKey && filterInputRef.current !== null) {
				filterInputRef.current.focus();
			}
		},
	});

	const singleFileActionsDisabled = selectedFiles.length !== 1;
	const multipleFilesActionsDisabled = selectedFiles.length < 1;

	return (
		<>
			<Stack>
				<TextField
					onKeyDown={(e) => {
						// stop propagation of keyDown events so that Nex-wide shortcuts (e.g. CTRL+X for cut)
						// don't fire if the focus is in the text field
						e.stopPropagation();
					}}
					size="small"
					label="Current Directory"
					value={cwdInput}
					onChange={(e) => setCwdInput(e.target.value)}
				/>
				<Button variant="outlined" onClick={() => fileProviderThunks.changeDirectory(cwdInput)}>
					Change CWD
				</Button>
				<Button variant="outlined" onClick={navigateUp}>
					Up
				</Button>
				<Divider orientation="vertical" flexItem />
				<Button variant="outlined" onClick={openSelectedFiles} disabled={singleFileActionsDisabled}>
					Open
				</Button>
				<Button
					variant="outlined"
					onClick={copySelectedFiles}
					disabled={multipleFilesActionsDisabled}
				>
					Copy
				</Button>
				<Button
					variant="outlined"
					onClick={cutSelectedFiles}
					disabled={multipleFilesActionsDisabled}
				>
					Cut
				</Button>
				<Button
					variant={draftPasteState === undefined ? 'outlined' : 'contained'}
					onClick={fileProviderThunks.pasteFiles}
					disabled={draftPasteState === undefined}
				>
					Paste
				</Button>
				<Button
					variant="outlined"
					onClick={deleteSelectedFiles}
					disabled={multipleFilesActionsDisabled}
				>
					Delete
				</Button>
			</Stack>
			<Stack>
				<TextField
					inputRef={filterInputRef}
					onKeyDown={(e) => {
						/*
						 * For some keys, the default action should be stopped (e.g. in case of ARROW_UP and
						 * ARROW_DOWN, the cursor in the input field jumps to the start/end of the field). The event
						 * must get propagated to the parent, this is needed for navigating the files using the
						 * keyboard. For all other events, we stop propagation to avoid interference with the
						 * keyboard navigation (e.g. CTRL+X would not only cut the text of the input field, but
						 * also the files currently selected)
						 */
						if (e.key === KEYS.ARROW_UP || e.key === KEYS.ARROW_DOWN || e.key === KEYS.ENTER) {
							e.preventDefault();
						} else {
							e.stopPropagation();
						}
					}}
					size="small"
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
			<Box css={(commonStyles.fullHeight, commonStyles.flex.shrinkAndFitVertical)}>
				<DataTable
					rows={filesToShow}
					headCells={[
						{
							label: 'Name',
							format: (row) => (
								<Stack
									css={styles.fileIcon}
									className={row.iconClasses.join(' ')}
									alignItems="center"
								>
									{formatFileName(row)}
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
					getIdOfRow={(row) => row.id}
					onRowClick={(row) => setIdsOfSelectedFiles([row.id])}
					onRowDoubleClick={(row) => {
						if (row.fileType === FILE_TYPE.DIRECTORY) {
							fileProviderThunks.changeDirectory(row.uri.path);
						} else if (row.fileType === FILE_TYPE.FILE) {
							fileProviderThunks.openFile(row.uri);
						}
					}}
					isRowSelected={(row) => !!selectedFiles.find((file) => file === row)}
				/>
			</Box>
			{pasteProcesses.length > 0 && (
				<Box {...horizontalScrollProps}>
					<Stack
						css={[styles.processesArea, commonStyles.flex.disableShrinkContainerHorizontal]}
						spacing={2}
					>
						{pasteProcesses.map((process) => (
							<PasteProcessEntry key={process.id} process={process} />
						))}
					</Stack>
				</Box>
			)}
		</>
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
