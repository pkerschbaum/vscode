import * as React from 'react';
import { Box } from '@material-ui/core';

import { URI } from 'vs/base/common/uri';

import { Stack } from 'vs/nex/ui/layouts/Stack';
import { LinearProgress } from 'vs/nex/ui/elements/LinearProgress';
import { PasteProcess as PasteProcessType, PASTE_STATUS } from 'vs/nex/platform/file-types';
import { formatter } from 'vs/nex/base/utils/formatter.util';
import { byteSize } from 'vs/nex/base/utils/byte-size.util';

export const PasteProcess: React.FC<{ process: PasteProcessType }> = ({ process }) => {
	const smallestUnitOfTotalSize = byteSize.probe(process.totalSize).unit;

	return (
		<Stack key={process.id} direction="column" alignItems="stretch">
			<Box>Destination: {URI.from(process.destinationFolder).fsPath}</Box>
			<Box>{formatter.bytes(process.bytesProcessed, { unit: smallestUnitOfTotalSize })}</Box>
			<Box>{formatter.bytes(process.totalSize, { unit: smallestUnitOfTotalSize })}</Box>
			<Box>{process.status}</Box>
			<LinearProgress
				value={
					process.status === PASTE_STATUS.FINISHED
						? 100
						: (process.bytesProcessed / process.totalSize) * 100
				}
				showLabel
			/>
		</Stack>
	);
};
