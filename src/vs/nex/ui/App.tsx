import * as React from 'react';
import { Box, Button, Divider, TextField } from '@material-ui/core';

import { URI } from 'vs/base/common/uri';
import * as arrays from 'vs/base/common/arrays';

import { styles } from 'vs/nex/ui/App.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { DataTable } from 'vs/nex/ui/elements/DataTable';
import {
	FileForUI,
	useFileProviderState,
	useFileProviderThunks,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { FILE_TYPE } from 'vs/nex/platform/file-types';
import { KEYS } from 'vs/nex/ui/constants';
import { useKeydownHandler } from 'vs/nex/ui/utils/events.hooks';
import { assertUnreachable } from 'vs/nex/base/utils/types.util';
import byteSize = require('byte-size');

export const App: React.FC = () => {
	const { cwd } = useFileProviderState();

	return (
		<Box
			sx={{ paddingX: 1, paddingY: 1 }}
			className="show-file-icons"
			css={commonStyles.fullHeight}
		>
			<Explorer key={URI.from(cwd).toString()} />
		</Box>
	);
};

const Explorer: React.FC = () => {
	const { cwd, files, draftPasteState } = useFileProviderState();
	const fileProviderThunks = useFileProviderThunks();

	const [cwdInput, setCwdInput] = React.useState(cwd.path);
	const [idsOfSelectedFiles, setIdsOfSelectedFiles] = React.useState<string[]>([]);

	const selectedFiles = files.filter((file) => !!idsOfSelectedFiles.find((id) => id === file.id));

	// sort files so that
	// - directories come first
	// - and each section (directories, files) is sorted by name
	let sortedFiles = arrays.mergeSort(files, (a, b) => {
		if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
			return -1;
		} else if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
			return 1;
		}
		return 0;
	});
	sortedFiles = arrays.mergeSort(files, (a, b) => {
		if (a.fileType === FILE_TYPE.DIRECTORY && b.fileType === FILE_TYPE.FILE) {
			return -1;
		} else if (a.fileType === FILE_TYPE.FILE && b.fileType === FILE_TYPE.DIRECTORY) {
			return 1;
		}
		return 0;
	});

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
		if (sortedFiles.length < 1) {
			return;
		}

		if (key === KEYS.ARROW_UP || key === KEYS.ARROW_DOWN) {
			const firstSelectedFileIndex = sortedFiles.findIndex((file) =>
				selectedFiles.some((selectedFile) => selectedFile === file),
			);
			if (selectedFiles.length === 0) {
				setIdsOfSelectedFiles([sortedFiles[0].id]);
			} else if (key === KEYS.ARROW_UP && firstSelectedFileIndex !== 0) {
				setIdsOfSelectedFiles([sortedFiles[firstSelectedFileIndex - 1].id]);
			} else if (key === KEYS.ARROW_DOWN && sortedFiles.length > firstSelectedFileIndex + 1) {
				setIdsOfSelectedFiles([sortedFiles[firstSelectedFileIndex + 1].id]);
			}
		} else if (key === KEYS.PAGE_UP) {
			setIdsOfSelectedFiles([sortedFiles[0].id]);
		} else if (key === KEYS.PAGE_DOWN) {
			setIdsOfSelectedFiles([sortedFiles[sortedFiles.length - 1].id]);
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
		[KEYS.BACKSPACE]: navigateUp,
	});

	const singleFileActionsDisabled = selectedFiles.length !== 1;
	const multipleFilesActionsDisabled = selectedFiles.length < 1;

	return (
		<>
			<Stack css={commonStyles.fullHeight} direction="column" alignItems="stretch" stretchContainer>
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
					<Button
						variant="outlined"
						onClick={openSelectedFiles}
						disabled={singleFileActionsDisabled}
					>
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
				<DataTable
					css={(commonStyles.fullHeight, commonStyles.flex.shrinkAndFitVertical)}
					rows={sortedFiles}
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
								if (row.size === undefined) {
									return;
								}

								const { value, unit } = byteSize(row.size);
								return `${value} ${unit}`;
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
			</Stack>
		</>
	);
};

function formatFileName(file: FileForUI): string {
	if (file.extension === undefined) {
		return file.name;
	}

	return `${file.name}.${file.extension}`;
}
