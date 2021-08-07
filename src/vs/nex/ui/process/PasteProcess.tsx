import * as React from 'react';
import { Box, Button, IconButton, Tooltip } from '@material-ui/core';
import DoubleArrowIcon from '@material-ui/icons/DoubleArrow';
import ClearAllIcon from '@material-ui/icons/ClearAll';

import { URI } from 'vs/base/common/uri';

import { styles } from 'vs/nex/ui/process/PasteProcess.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { TextBox } from 'vs/nex/ui/elements/TextBox';
import { LinearProgress } from 'vs/nex/ui/elements/LinearProgress';
import { PasteProcess as PasteProcessType, PROCESS_STATUS } from 'vs/nex/platform/file-types';
import { useFileActions } from 'vs/nex/platform/file.hooks';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { formatter } from 'vs/nex/base/utils/formatter.util';
import { byteSize } from 'vs/nex/base/utils/byte-size.util';
import { numbers } from 'vs/nex/base/utils/numbers.util';
import { assertUnreachable } from 'vs/nex/base/utils/types.util';

export const PasteProcess: React.FC<{ process: PasteProcessType }> = ({ process }) => {
	const fileActions = useFileActions();

	const smallestUnitOfTotalSize = byteSize.probe(process.totalSize).unit;
	const { fileName, extension } = uriHelper.extractNameAndExtension(process.destinationFolder);

	const destinationFolderLabel = formatter.file({ name: fileName, extension });
	let content;
	switch (process.status) {
		case PROCESS_STATUS.RUNNING: {
			content = undefined;
			break;
		}
		case PROCESS_STATUS.SUCCESS: {
			content = <TextBox>Files transferred successfully</TextBox>;
			break;
		}
		case PROCESS_STATUS.FAILURE: {
			content = (
				<Stack direction="column" alignItems="flex-start">
					<TextBox>Error occured during transfer of the files:</TextBox>
					<TextBox>{process.error}</TextBox>
				</Stack>
			);
			break;
		}
		default: {
			assertUnreachable(process);
		}
	}

	const percentageBytesProcessed =
		process.status === PROCESS_STATUS.SUCCESS
			? 100
			: numbers.roundToDecimals((process.bytesProcessed / process.totalSize) * 100, 0);

	return (
		<Stack key={process.id} direction="column" alignItems="stretch">
			<Stack spacing={4} alignItems="center">
				<Stack spacing={2}>
					<Stack direction="column">
						{process.sourceUris.slice(0, 2).map((uri) => {
							const { fileName, extension } = uriHelper.extractNameAndExtension(uri);
							const sourceFileLabel = formatter.file({ name: fileName, extension });
							return (
								<TextBox key={URI.from(uri).toString()} fontBold>
									{sourceFileLabel}
								</TextBox>
							);
						})}
						{process.sourceUris.length > 2 && <TextBox fontBold>...</TextBox>}
					</Stack>

					<DoubleArrowIcon />
					<TextBox fontBold>{destinationFolderLabel}</TextBox>
				</Stack>

				{(process.status === PROCESS_STATUS.SUCCESS ||
					process.status === PROCESS_STATUS.FAILURE) && (
					<Tooltip title="Remove card" disableInteractive>
						<IconButton size="large" onClick={() => fileActions.removeProcess(process.id)}>
							<ClearAllIcon fontSize="inherit" />
						</IconButton>
					</Tooltip>
				)}
			</Stack>

			{content}

			<Stack css={commonStyles.fullWidth} spacing={0}>
				<Box css={[styles.linearProgressBox, commonStyles.flex.shrinkAndFitHorizontal]}>
					<LinearProgress value={percentageBytesProcessed} />
				</Box>
				<TextBox>{percentageBytesProcessed}%</TextBox>
			</Stack>

			{process.status !== PROCESS_STATUS.SUCCESS && (
				<Stack spacing={0.5}>
					<TextBox>
						{formatter.bytes(process.bytesProcessed, { unit: smallestUnitOfTotalSize })}
					</TextBox>
					<TextBox>/</TextBox>
					<TextBox>{formatter.bytes(process.totalSize, { unit: smallestUnitOfTotalSize })}</TextBox>
				</Stack>
			)}

			{process.status === PROCESS_STATUS.RUNNING && (
				<Button onClick={() => process.cancellationTokenSource.cancel()}>Cancel</Button>
			)}
		</Stack>
	);
};
