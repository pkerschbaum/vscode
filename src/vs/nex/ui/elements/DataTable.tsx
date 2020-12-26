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

interface EnhancedTableProps<RowType extends ObjectLiteral> {
	rows: RowType[];
	headCells: HeadCell<RowType>[];
	getIdOfRow: (row: RowType) => string | number;
	isRowSelected?: (row: RowType) => boolean;
	onRowClick: (row: RowType) => void | Promise<void>;
	onRowDoubleClick: (row: RowType) => void | Promise<void>;
	className?: string;
}

export function DataTable<RowType extends ObjectLiteral>(props: EnhancedTableProps<RowType>) {
	const {
		rows,
		headCells,
		getIdOfRow,
		isRowSelected,
		onRowClick,
		onRowDoubleClick,
		className,
	} = props;

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
						<TableRow
							key={getIdOfRow(row)}
							css={styles.row}
							hover
							onClick={() => onRowClick(row)}
							onDoubleClick={() => onRowDoubleClick(row)}
							tabIndex={-1}
							selected={isRowSelected === undefined ? false : isRowSelected(row)}
						>
							{headCells.map((headCell) => {
								let valueToShow;
								if ('format' in headCell) {
									valueToShow = headCell.format(row);
								} else {
									valueToShow = row[headCell.property];
								}
								return <TableCell key={headCell.label}>{valueToShow}</TableCell>;
							})}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}

interface EnhancedTableHeadProps<RowType extends ObjectLiteral> {
	headCells: HeadCell<RowType>[];
}

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
