import * as React from 'react';
import { Paper, useTheme } from '@material-ui/core';

import { styles } from 'vs/nex/ui/process/ProcessCard.styles';
import { Process, PROCESS_TYPE } from 'vs/nex/platform/file-types';
import { PasteProcess } from 'vs/nex/ui/process/PasteProcess';
import { DeleteProcess } from 'vs/nex/ui/process/DeleteProcess';
import { assertUnreachable } from 'vs/nex/base/utils/types.util';

export const ProcessCard: React.FC<{ process: Process }> = ({ process }) => {
	const { processStatusColors } = useTheme();

	let backgroundColor;
	switch (process.type) {
		case PROCESS_TYPE.PASTE: {
			backgroundColor = processStatusColors.pasteProcess[process.status];
			break;
		}
		case PROCESS_TYPE.DELETE: {
			backgroundColor = processStatusColors.deleteProcess[process.status];
			break;
		}
		default:
			assertUnreachable(process);
	}

	return (
		<Paper css={styles.card} style={{ backgroundColor }}>
			{process.type === PROCESS_TYPE.PASTE ? (
				<PasteProcess process={process} />
			) : process.type === PROCESS_TYPE.DELETE ? (
				<DeleteProcess process={process} />
			) : (
				assertUnreachable(process)
			)}
		</Paper>
	);
};
