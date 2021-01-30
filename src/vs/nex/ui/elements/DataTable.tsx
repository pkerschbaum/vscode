// adapted from: https://material-ui.com/components/tables/#sorting-amp-selecting
import * as React from 'react';
import {
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from '@material-ui/core';

import { ObjectLiteral } from '../../base/utils/types.util';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { styles } from 'vs/nex/ui/elements/DataTable.styles';

type HeadCell<RowType extends ObjectLiteral> =
	| {
			label: string;
			property: keyof RowType;
			numeric?: boolean;
	  }
	| {
			label: string;
			format: (row: RowType) => React.ReactNode;
			numeric?: boolean;
	  };

type EnhancedTableBaseProps<RowType extends ObjectLiteral> = {
	headCells: HeadCell<RowType>[];
	onRowClick: (row: RowType) => void | Promise<void>;
	onRowDoubleClick: (row: RowType) => void | Promise<void>;
};

type RowWithMetadata<RowType extends ObjectLiteral> = {
	id: string | number;
	data: RowType;
	selected?: boolean;
};

type EnhancedTableProps<RowType extends ObjectLiteral> = EnhancedTableBaseProps<RowType> & {
	rows: RowWithMetadata<RowType>[];
	className?: string;
};

export function DataTable<RowType extends ObjectLiteral>(props: EnhancedTableProps<RowType>) {
	const { rows, headCells, onRowClick, onRowDoubleClick, className } = props;

	return (
		<TableContainer
			className={className}
			css={commonStyles.fullHeight}
			component={Paper}
			variant="outlined"
		>
			<Table stickyHeader size="small">
				<EnhancedTableHead<RowType> headCells={headCells} />
				<TableBody>
					{rows.map((row) => (
						<EnhancedTableRow
							key={row.id}
							row={row}
							headCells={headCells}
							onRowClick={onRowClick}
							onRowDoubleClick={onRowDoubleClick}
						/>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}

type EnhancedTableHeadProps<RowType extends ObjectLiteral> = {
	headCells: HeadCell<RowType>[];
};

function EnhancedTableHead<RowType extends ObjectLiteral>(props: EnhancedTableHeadProps<RowType>) {
	const { headCells } = props;

	return (
		<TableHead>
			<TableRow>
				{headCells.map((headCell) => (
					<TableCell key={headCell.label} align={headCell.numeric ? 'right' : 'left'}>
						{headCell.label}
					</TableCell>
				))}
			</TableRow>
		</TableHead>
	);
}

type EnhancedTableRowProps<RowType extends ObjectLiteral> = EnhancedTableBaseProps<RowType> & {
	row: RowWithMetadata<RowType>;
};

function EnhancedTableRow<RowType extends ObjectLiteral>({
	row,
	headCells,
	onRowClick,
	onRowDoubleClick,
}: EnhancedTableRowProps<RowType>) {
	return (
		<TableRow
			css={styles.row}
			hover
			onClick={() => onRowClick(row.data)}
			onDoubleClick={() => onRowDoubleClick(row.data)}
			tabIndex={-1}
			selected={!!row.selected}
		>
			{headCells.map((headCell) => {
				let valueToShow;
				if ('format' in headCell) {
					valueToShow = headCell.format(row.data);
				} else {
					valueToShow = row.data[headCell.property];
				}
				return <TableCell key={headCell.label}>{valueToShow}</TableCell>;
			})}
		</TableRow>
	);
}
