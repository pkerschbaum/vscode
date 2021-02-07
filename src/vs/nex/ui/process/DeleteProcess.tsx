import * as React from 'react';
import { Box, Button } from '@material-ui/core';

import { URI } from 'vs/base/common/uri';

import { Stack } from 'vs/nex/ui/layouts/Stack';
import { DeleteProcess as DeleteProcessType } from 'vs/nex/platform/file-types';
import { useFileActions } from 'vs/nex/platform/file.hooks';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { formatter } from 'vs/nex/base/utils/formatter.util';

export const DeleteProcess: React.FC<{ process: DeleteProcessType }> = ({ process }) => {
	const fileActions = useFileActions();

	return (
		<Stack key={process.id} direction="column" alignItems="stretch">
			<Button onClick={() => fileActions.runDeleteProcess(process.id)}>Run</Button>

			<Box>{process.status}</Box>

			{process.uris.map((uri) => {
				const { fileName, extension } = uriHelper.extractNameAndExtension(uri);

				return (
					<Box key={URI.from(uri).toString()}>{formatter.file({ name: fileName, extension })}</Box>
				);
			})}
		</Stack>
	);
};
