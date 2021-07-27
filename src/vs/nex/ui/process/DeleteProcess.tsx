import * as React from 'react';
import { Button, LinearProgress } from '@material-ui/core';

import { URI } from 'vs/base/common/uri';

import { Stack } from 'vs/nex/ui/layouts/Stack';
import { TextBox } from 'vs/nex/ui/elements/TextBox';
import { DeleteProcess as DeleteProcessType, PROCESS_STATUS } from 'vs/nex/platform/file-types';
import { useFileActions } from 'vs/nex/platform/file.hooks';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { formatter } from 'vs/nex/base/utils/formatter.util';
import { assertUnreachable } from 'vs/nex/base/utils/types.util';

export const DeleteProcess: React.FC<{ process: DeleteProcessType }> = ({ process }) => {
	const fileActions = useFileActions();

	let content;
	switch (process.status) {
		case PROCESS_STATUS.PENDING_FOR_USER_INPUT: {
			content = (
				<>
					<Button
						variant="contained"
						onClick={() => fileActions.runDeleteProcess(process.id, { useTrash: true })}
					>
						Move to trash
					</Button>
					<Button
						variant="contained"
						onClick={() => fileActions.runDeleteProcess(process.id, { useTrash: false })}
					>
						Delete permanently
					</Button>
					<Button variant="contained" onClick={() => fileActions.removeProcess(process.id)}>
						Abort
					</Button>
				</>
			);
			break;
		}
		case PROCESS_STATUS.RUNNING: {
			content = (
				<>
					<TextBox>Deletion is in progress...</TextBox>
					<LinearProgress variant="indeterminate" />
				</>
			);
			break;
		}
		case PROCESS_STATUS.SUCCESS: {
			content = <TextBox>Files deleted successfully</TextBox>;
			break;
		}
		case PROCESS_STATUS.FAILURE: {
			content = (
				<Stack direction="column" alignItems="flex-start">
					<TextBox>Error occured during deletion of the files:</TextBox>
					<TextBox>{process.error}</TextBox>
				</Stack>
			);
			break;
		}
		default: {
			assertUnreachable(process);
		}
	}

	return (
		<Stack key={process.id} direction="column" alignItems="stretch">
			{process.uris.slice(0, 2).map((uri) => {
				const { fileName, extension } = uriHelper.extractNameAndExtension(uri);
				const fileLabel = formatter.file({ name: fileName, extension });

				return (
					<TextBox key={URI.from(uri).toString()} fontBold>
						{fileLabel}
					</TextBox>
				);
			})}
			{process.uris.length > 2 && <TextBox fontBold>...</TextBox>}

			{content}
		</Stack>
	);
};
