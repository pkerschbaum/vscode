import * as React from 'react';
import { Box } from '@material-ui/core';

import { styles } from 'vs/nex/ui/process/PasteProcess.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { LinearProgress } from 'vs/nex/ui/elements/LinearProgress';
import { PasteProcess as PasteProcessType, PROCESS_STATUS } from 'vs/nex/platform/file-types';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { formatter } from 'vs/nex/base/utils/formatter.util';
import { byteSize } from 'vs/nex/base/utils/byte-size.util';
import { numbers } from 'vs/nex/base/utils/numbers.util';

export const PasteProcess: React.FC<{ process: PasteProcessType }> = ({ process }) => {
	const smallestUnitOfTotalSize = byteSize.probe(process.totalSize).unit;
	const { fileName, extension } = uriHelper.extractNameAndExtension(process.destinationFolder);
	const percentageBytesProcessed =
		process.status === PROCESS_STATUS.SUCCESS
			? 100
			: numbers.roundToDecimals((process.bytesProcessed / process.totalSize) * 100, 0);

	return (
		<Stack key={process.id} direction="column" alignItems="stretch">
			<Box>Destination: {formatter.file({ name: fileName, extension })}</Box>

			<Stack spacing={0.5}>
				<Box component="span">
					{formatter.bytes(process.bytesProcessed, { unit: smallestUnitOfTotalSize })}
				</Box>
				<Box component="span">/</Box>
				<Box component="span">
					{formatter.bytes(process.totalSize, { unit: smallestUnitOfTotalSize })}
				</Box>
			</Stack>

			<Stack css={commonStyles.fullWidth} spacing={0}>
				<Box css={[styles.linearProgressBox, commonStyles.flex.shrinkAndFitHorizontal]}>
					<LinearProgress value={percentageBytesProcessed} />
				</Box>
				<Box component="span">{percentageBytesProcessed}%</Box>
			</Stack>
		</Stack>
	);
};
