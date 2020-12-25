import * as React from 'react';
import { Box, Button, TextField } from '@material-ui/core';

import { URI } from 'vs/base/common/uri';
import * as arrays from 'vs/base/common/arrays';

import { styles } from 'vs/nex/ui/App.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { DataTable } from 'vs/nex/ui/elements/DataTable';
import { useSelector } from 'vs/nex/platform/store/store';
import {
	useFileProviderState,
	useFileProviderThunks,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { FileType } from 'vs/nex/platform/file-types';
import byteSize = require('byte-size');

export const App: React.FC<{}> = () => {
	const { files } = useFileProviderState();

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
		if (a.type === FileType.Directory && b.type === FileType.File) {
			return -1;
		} else if (a.type === FileType.File && b.type === FileType.Directory) {
			return 1;
		}
		return 0;
	});

	return (
		<Box
			sx={{ paddingX: 1, paddingY: 1 }}
			className="show-file-icons"
			css={commonStyles.fullHeight}
		>
			<Stack css={commonStyles.fullHeight} direction="column" alignItems="stretch" stretchContainer>
				<Actions />
				<DataTable
					css={(commonStyles.fullHeight, commonStyles.flex.shrinkAndFitVertical)}
					rows={sortedFiles}
					headCells={[
						{
							label: 'Name',
							format: (row) => (
								<Stack
									css={styles.dirContentIcon}
									className={row.iconClasses.join(' ')}
									alignItems="center"
								>
									{row.name}
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
					onRowClick={(row) => {
						// TODO implement
						console.dir(row);
					}}
				/>
			</Stack>
		</Box>
	);
};

const Actions: React.FC<{}> = () => {
	const cwd = useSelector((state) => URI.from(state.fileProvider.cwd));
	const [input, setInput] = React.useState(cwd.path);
	const fileProviderThunks = useFileProviderThunks();

	return (
		<Stack>
			<TextField label="cwd" value={input} onChange={(e) => setInput(e.target.value)} />
			<Button onClick={() => fileProviderThunks.changeDirectory(input)}>Change CWD</Button>
		</Stack>
	);
};
