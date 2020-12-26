import * as React from 'react';
import { Box, Button, TextField } from '@material-ui/core';

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
import byteSize = require('byte-size');

export const App: React.FC<{}> = () => {
	const [idsOfSelectedFiles, setSelectedFiles] = React.useState<string[]>([]);
	const { cwd, files } = useFileProviderState();
	const fileProviderThunks = useFileProviderThunks();

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

	const openSelectedFiles = () => {
		const selectedFiles = files.filter((file) => !!idsOfSelectedFiles.find((id) => id === file.id));

		if (selectedFiles.length === 1 && selectedFiles[0].fileType === FILE_TYPE.DIRECTORY) {
			fileProviderThunks.changeDirectory(selectedFiles[0].uri.path);
		} else {
			selectedFiles
				.filter((selectedFile) => selectedFile.fileType === FILE_TYPE.FILE)
				.forEach((selectedFile) => fileProviderThunks.openFile(selectedFile.uri));
		}
	};

	const deleteSelectedFiles = async () => {
		const selectedFiles = files.filter((file) => !!idsOfSelectedFiles.find((id) => id === file.id));
		await fileProviderThunks.moveFilesToTrash(selectedFiles.map((file) => file.uri));
	};

	return (
		<Box
			sx={{ paddingX: 1, paddingY: 1 }}
			className="show-file-icons"
			css={commonStyles.fullHeight}
		>
			<Stack css={commonStyles.fullHeight} direction="column" alignItems="stretch" stretchContainer>
				<Actions
					key={URI.from(cwd).toString()}
					openAction={openSelectedFiles}
					deleteAction={deleteSelectedFiles}
				/>
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
					onRowClick={(row) => setSelectedFiles([row.id])}
					onRowDoubleClick={(row) => {
						if (row.fileType === FILE_TYPE.DIRECTORY) {
							fileProviderThunks.changeDirectory(row.uri.path);
						} else if (row.fileType === FILE_TYPE.FILE) {
							fileProviderThunks.openFile(row.uri);
						}
					}}
					isRowSelected={(row) => !!idsOfSelectedFiles.find((id) => id === row.id)}
				/>
			</Stack>
		</Box>
	);
};

const Actions: React.FC<{ openAction: () => void; deleteAction: () => void }> = ({
	openAction,
	deleteAction,
}) => {
	const { cwd } = useFileProviderState();
	const [input, setInput] = React.useState(cwd.path);
	const fileProviderThunks = useFileProviderThunks();

	function navigateUp() {
		fileProviderThunks.changeDirectory(URI.joinPath(URI.from(cwd), '..').path);
	}

	return (
		<Stack>
			<TextField
				size="small"
				label="Current Directory"
				value={input}
				onChange={(e) => setInput(e.target.value)}
			/>
			<Button onClick={navigateUp}>Up</Button>
			<Button onClick={() => fileProviderThunks.changeDirectory(input)}>Change CWD</Button>
			<Button onClick={openAction}>Open</Button>
			<Button onClick={deleteAction}>Delete</Button>
		</Stack>
	);
};

function formatFileName(file: FileForUI): string {
	if (file.extension === undefined) {
		return file.name;
	}

	return `${file.name}.${file.extension}`;
}
