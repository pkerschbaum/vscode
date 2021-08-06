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

	let contentToRender;
	switch (process.status) {
		case PROCESS_STATUS.PENDING_FOR_USER_INPUT: {
			contentToRender = (
				<DeleteProcessCard process={process}>
					<Button
						autoFocus
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
				</DeleteProcessCard>
			);
			break;
		}
		case PROCESS_STATUS.RUNNING: {
			contentToRender = (
				<DeleteProcessCard process={process}>
					<TextBox>Deletion is in progress...</TextBox>
					<LinearProgress variant="indeterminate" />
				</DeleteProcessCard>
			);
			break;
		}
		case PROCESS_STATUS.SUCCESS: {
			contentToRender = (
				<DeleteProcessCard process={process}>
					<TextBox>Files deleted successfully</TextBox>
				</DeleteProcessCard>
			);
			break;
		}
		case PROCESS_STATUS.FAILURE: {
			contentToRender = (
				<DeleteProcessCard process={process}>
					<Stack direction="column" alignItems="flex-start">
						<TextBox>Error occured during deletion of the files:</TextBox>
						<TextBox>{process.error}</TextBox>
					</Stack>
				</DeleteProcessCard>
			);
			break;
		}
		default: {
			assertUnreachable(process);
		}
	}

	return contentToRender;
};

type DeleteProcessCardProps = {
	process: DeleteProcessType;
};

const DeleteProcessCard: React.FC<DeleteProcessCardProps> = ({ process, children }) => {
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

			{children}
		</Stack>
	);
};
