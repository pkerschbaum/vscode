import * as React from 'react';
import { Paper, Table, TableContainer } from '@material-ui/core';
import { css } from '@emotion/react';

import { Stack } from 'vs/nex/ui/layouts/Stack';
import { TableBody } from 'vs/nex/ui/elements/DataTable/TableBody';
import { EmptyRow } from 'vs/nex/ui/elements/DataTable/EmptyRow';
import { commonStyles } from 'vs/nex/ui/Common.styles';

type DataTableProps = {
	renderNoDataPresentMessage?: boolean;
	labels?: { container?: string };
	classes?: { tableContainer?: string };
	applyIntrinsicHeight?: boolean;

	children: null | React.ReactNode[];
	footer?: React.ReactNode;
};

export function DataTable(props: DataTableProps): React.ReactElement<DataTableProps> {
	const {
		renderNoDataPresentMessage,
		labels,
		classes: classesFromProps,
		applyIntrinsicHeight,
		children,
		footer,
	} = props;

	return (
		<Stack
			aria-label={labels?.container}
			direction="column"
			spacing={0}
			css={css`
				height: 100%;
				max-height: 100%;
				min-height: 0;
				overflow-x: auto;
			`}
		>
			<TableContainer
				css={[
					commonStyles.flex.shrinkAndFitVertical,
					css`
						flex-basis: ${!applyIntrinsicHeight ? 0 : 'auto'};
					`,
				]}
				className={classesFromProps?.tableContainer}
				component={Paper}
				variant="outlined"
			>
				<Table
					stickyHeader
					size="small"
					style={{ height: renderNoDataPresentMessage ? '100%' : undefined }}
				>
					{children}
					{renderNoDataPresentMessage && (
						<TableBody>
							<EmptyRow />
						</TableBody>
					)}
				</Table>
			</TableContainer>
			{footer}
		</Stack>
	);
}
