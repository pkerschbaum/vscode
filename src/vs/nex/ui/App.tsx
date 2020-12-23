import * as React from 'react';
import { Box, Button, TextField } from '@material-ui/core';

import { URI } from 'vs/base/common/uri';

import { styles } from 'vs/nex/ui/App.styles';
import Stack from 'vs/nex/ui/layouts/Stack';
import { useSelector } from 'vs/nex/platform/store/store';
import {
	useFileProviderState,
	useFileProviderThunks,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';

export const App: React.FC<{}> = () => {
	const { files } = useFileProviderState();

	return (
		<Box sx={{ paddingX: 1, paddingY: 2 }} css={styles.container}>
			<Stack direction="column" alignItems="flex-start">
				<Actions />
				{files.map((file) => (
					<Stack key={URI.from(file.uri).toString()}>{file.uri.path}</Stack>
				))}
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
