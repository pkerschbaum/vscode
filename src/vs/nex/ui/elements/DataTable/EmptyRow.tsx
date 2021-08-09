import * as React from 'react';
import { TableCell, TableRow } from '@material-ui/core';

import { Stack } from 'vs/nex/ui/layouts/Stack';
import { ROW_HEIGHT } from 'vs/nex/ui/elements/DataTable/Row';

export const EmptyRow: React.FC = () => {
	return (
		<TableRow style={{ height: ROW_HEIGHT }} tabIndex={-1}>
			<TableCell colSpan={999}>
				<Stack justifyContent="center">
					<strong>No data present</strong>
				</Stack>
			</TableCell>
		</TableRow>
	);
};
