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
		if (a.name.toLowerCase() < b.name.toLowerCase()) {
			return -1;
		} else if (a.name.toLowerCase() > b.name.toLowerCase()) {
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

	/**
	 * - If no file is selected, select the first file
	 * - If at least one file is selected,
	 * -- and arrow up is pressed, select the file above the first currently selected file (if file above exists)
	 * -- and arrow down is pressed, select the file below the first currently selected file (if file below exists)
	 */
	const changeSelectedFile = (key: 'ArrowUp' | 'ArrowDown' | 'PageUp' | 'PageDown') => {
		if (sortedFiles.length < 1) {
			return;
		}

		if (key === 'ArrowUp' || key === 'ArrowDown') {
			const firstSelectedFileIndex = sortedFiles.findIndex((file) =>
				selectedFiles.some((selectedFile) => selectedFile === file),
			);
			if (selectedFiles.length === 0) {
				setIdsOfSelectedFiles([sortedFiles[0].id]);
			} else if (key === 'ArrowUp' && firstSelectedFileIndex !== 0) {
				setIdsOfSelectedFiles([sortedFiles[firstSelectedFileIndex - 1].id]);
			} else if (key === 'ArrowDown' && sortedFiles.length > firstSelectedFileIndex + 1) {
				setIdsOfSelectedFiles([sortedFiles[firstSelectedFileIndex + 1].id]);
			}
		} else if (key === 'PageUp') {
			setIdsOfSelectedFiles([sortedFiles[0].id]);
		} else if (key === 'PageDown') {
			setIdsOfSelectedFiles([sortedFiles[sortedFiles.length - 1].id]);
		} else {
			assertUnreachable(key);
		}
	};

	/**
	 * - If arrow-up or arrow-down is pressed, call [changeSelectedFile]
	 * - If enter is pressed, open all currently selected files
	 * - If delete is pressed, delete all currently selected files
	 */
	const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
		console.dir(e);
		const { key } = e;
		if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'PageUp' || key === 'PageDown') {
			changeSelectedFile(key);
			e.preventDefault();
		} else if (key === 'Enter') {
			openSelectedFiles();
			e.preventDefault();
		} else if (key === 'Delete') {
			deleteSelectedFiles();
			e.preventDefault();
		}
	};

	const singleFileActionsDisabled = selectedFiles.length !== 1;
	const multipleFilesActionsDisabled = selectedFiles.length < 1;

	return (
		<>
			<Stack
				css={commonStyles.fullHeight}
				direction="column"
				alignItems="stretch"
				stretchContainer
				boxProps={{ onKeyDown }}
			>
				<Stack>
					<TextField
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
						onClick={cutOrCopySelectedFiles(false)}
						disabled={multipleFilesActionsDisabled}
					>
						Copy
					</Button>
					<Button
						variant="outlined"
						onClick={cutOrCopySelectedFiles(true)}
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
