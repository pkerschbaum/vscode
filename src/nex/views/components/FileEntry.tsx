import byteSize = require('byte-size');
import * as React from 'react';
const { useRef, useEffect } = React;
import styled from 'styled-components';
import relativeDate = require('tiny-relative-date');

import { FileType } from 'nex/platform/file-types';

import { File } from 'nex/views/components/Explorer';
import { dimensionPaddingVerticalLarge } from 'nex/views/constants/dimensions';
import { colorSupporting } from 'nex/views/constants/colors';
import { commonShadowTransform, commonShadowFocus } from 'nex/views/constants/style-elements';

export const COLUMN_WIDTH_ICON = 60;
export const COLUMN_WIDTH_NAME = 300;
export const COLUMN_WIDTH_TYPE = 100;
export const COLUMN_WIDTH_SIZE = 100;
export const COLUMN_WIDTH_LAST_MODIFIED = 120;

const EXTENSION_DIRECTORY = 'Folder';

const EntryRow = styled.div<{ selected: boolean }>`
	display: flex;
	align-items: center;

	transition: ${commonShadowTransform};
	user-select: none;

	:hover {
		box-shadow: ${commonShadowFocus};
		transition: ${commonShadowTransform};
	}

	background: ${(props) => (props.selected ? colorSupporting : 'inherit')};

	& > * {
		padding: ${dimensionPaddingVerticalLarge} 0.5em;
		vertical-align: middle;
	}
`;

const EntryCell = styled.div<{ width: number }>`
	width: ${(props) => props.width + 'px'};
	overflow: hidden;
	text-overflow: ellipsis;
`;

const FileIcon = styled.div`
	text-align: center;

	::before {
		/* icon-theme.ts sets a unwanted font-size, use !important to overrule that*/
		font-size: 2.5em !important;

		background-size: 1em;
		background-position: 0;
		background-repeat: no-repeat;
		display: inline-block;
		-webkit-font-smoothing: antialiased;
		vertical-align: top;
		flex-shrink: 0;
		height: 1em;
		width: 1em;
	}
`;

interface FileEntryProps {
	selected: boolean;
	onClick: React.MouseEventHandler<HTMLDivElement>;
	onDoubleClick: () => void;
}

const FileEntry = ({
	name,
	type,
	iconClasses,
	extension,
	size,
	lastChangedAt,
	selected,
	onClick,
	onDoubleClick,
}: File & FileEntryProps) => {
	// if element is selected and outside view, scroll it into view
	const rowRef = useRef<HTMLDivElement>(null);
	const executeScroll = () =>
		rowRef.current!.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

	useEffect(() => {
		if (selected) {
			executeScroll();
		}
	}, [selected]);

	// format both the size and the last-changed-at date to human-readable values
	let sizeStr: string | undefined;
	if (size !== undefined) {
		const { value, unit } = byteSize(size);
		sizeStr = `${value} ${unit}`;
	}
	let lastChangedAtStr: string | undefined;
	if (lastChangedAt !== undefined) {
		lastChangedAtStr = relativeDate(new Date(lastChangedAt));
	}

	return (
		<EntryRow ref={rowRef} onClick={onClick} onDoubleClick={onDoubleClick} selected={selected}>
			<EntryCell width={COLUMN_WIDTH_ICON}>
				<FileIcon className={`${iconClasses.join(' ')}`} />
			</EntryCell>
			<EntryCell width={COLUMN_WIDTH_NAME}>{name}</EntryCell>
			<EntryCell width={COLUMN_WIDTH_TYPE}>
				{type === FileType.Directory ? EXTENSION_DIRECTORY : extension}
			</EntryCell>
			<EntryCell width={COLUMN_WIDTH_SIZE}>{sizeStr}</EntryCell>
			<EntryCell width={COLUMN_WIDTH_LAST_MODIFIED}>{lastChangedAtStr}</EntryCell>
		</EntryRow>
	);
};

export default FileEntry;
