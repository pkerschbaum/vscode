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
	isRowSelected?: (row: RowType) => boolean;
	onRowClick: (row: RowType) => void | Promise<void>;
	onRowDoubleClick: (row: RowType) => void | Promise<void>;
};

type EnhancedTableProps<RowType extends ObjectLiteral> = EnhancedTableBaseProps<RowType> & {
	rows: RowType[];
	getIdOfRow: (row: RowType) => string | number;
	className?: string;
};

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
						<EnhancedTableRow
							key={getIdOfRow(row)}
							row={row}
							headCells={headCells}
							isRowSelected={isRowSelected}
							onRowClick={onRowClick}
							onRowDoubleClick={onRowDoubleClick}
						/>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}

type EnhancedTableRowProps<RowType extends ObjectLiteral> = EnhancedTableBaseProps<RowType> & {
	row: RowType;
};

function EnhancedTableRow<RowType extends ObjectLiteral>({
	row,
	headCells,
	isRowSelected,
	onRowClick,
	onRowDoubleClick,
}: EnhancedTableRowProps<RowType>) {
	// if element is selected and outside view, scroll it into view
	const rowRef = React.useRef<HTMLTableRowElement>(null);
	const executeScroll = () =>
		rowRef.current!.scrollIntoView({ behavior: 'smooth', block: 'center' });

	const selected = isRowSelected === undefined ? false : isRowSelected(row);

	React.useEffect(() => {
		if (selected) {
			executeScroll();
		}
	}, [selected]);

	return (
		<TableRow
			ref={rowRef}
			css={styles.row}
			hover
			onClick={() => onRowClick(row)}
			onDoubleClick={() => onRowDoubleClick(row)}
			tabIndex={-1}
			selected={selected}
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
