import * as React from 'react';
const { useRef, useLayoutEffect } = React;
import styled from 'styled-components';

import { mergeSort } from 'nex/base/utils/arrays';
import { FileType } from 'nex/platform/file-types';

import { File } from 'nex/views/components/Explorer';
import FileEntry, {
	COLUMN_WIDTH_ICON,
	COLUMN_WIDTH_NAME,
	COLUMN_WIDTH_TYPE,
	COLUMN_WIDTH_SIZE,
	COLUMN_WIDTH_LAST_MODIFIED,
} from 'nex/views/components/FileEntry';
import {
	dimensionMarginMedium,
	dimensionPaddingVerticalMedium,
} from 'nex/views/constants/dimensions';
import { colorGrey } from 'nex/views/constants/colors';
import { commonShadow } from 'nex/views/constants/style-elements';

const Div = styled.div`
	display: flex;
	flex-direction: column;
	outline: 0;

	overflow: auto;

	margin-top: ${dimensionMarginMedium};
`;

const HeaderRow = styled.div`
	display: flex;
	align-items: center;

	flex-grow: 0;
	flex-shrink: 0;
	flex-basis: 2em;

	border-bottom: 1px solid;
	border-top: 1px solid;
	border-color: ${colorGrey};

	box-shadow: ${commonShadow};

	* {
		padding: ${dimensionPaddingVerticalMedium} 0.5em;
		text-transform: uppercase;
		color: ${colorGrey};
	}
`;

const HeaderCell = styled.div<{ width: number }>`
	width: ${(props) => props.width + 'px'};
`;

const Content = styled.div`
	position: relative;
	flex-grow: 1;
	flex-shrink: 1;
	flex-basis: auto;
	overflow-y: scroll;
`;

export interface DirectoryContentProps {
	cwd: string;
	fileMetas: FileMeta[];
	selectFileEntry: (id: string) => void;
	toggleFileEntrySelection: (id: string) => void;
	selectAndOpenFileEntry: (id: string) => void;
	moveSelectedFilesToTrash: () => void;
	openSelectedFiles: () => Promise<void>;
}

interface FileMeta {
	file: File;
	selected: boolean;
}

const DirectoryContent = ({
	cwd,
	fileMetas,
	selectFileEntry,
	toggleFileEntrySelection,
	selectAndOpenFileEntry,
	moveSelectedFilesToTrash,
	openSelectedFiles,
}: DirectoryContentProps) => {
	// scroll content to top when cwd (and thus, the contents) changed
	const contentRef = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		contentRef.current!.scrollTo(0, 0);
	}, [cwd]);

	// sort files so that
	// - directories come first
	// - and each section (directories, files) is sorted by name
	let sortedFiles = mergeSort(fileMetas, (a, b) => {
		if (a.file.name.toLowerCase() < b.file.name.toLowerCase()) {
			return -1;
		} else if (a.file.name.toLowerCase() > b.file.name.toLowerCase()) {
			return 1;
		}
		return 0;
	});
	sortedFiles = mergeSort(sortedFiles, (a, b) => {
		if (a.file.type === FileType.Directory && b.file.type === FileType.File) {
			return -1;
		} else if (a.file.type === FileType.File && b.file.type === FileType.Directory) {
			return 1;
		}
		return 0;
	});

	/**
	 * - If no file is selected, select the first file
	 * - If at least one file is selected,
	 * -- and arrow up is pressed, select the file above the first currently selected file (if file above exists)
	 * -- and arrow down is pressed, select the file below the first currently selected file (if file below exists)
	 */
	const changeSelectedFile = (key: string) => {
		const firstSelectedFileIndex = sortedFiles.findIndex((fileMeta) => fileMeta.selected);
		if (firstSelectedFileIndex === -1) {
			selectFileEntry(sortedFiles[0].file.id);
		} else if (key === 'ArrowUp' && firstSelectedFileIndex !== 0) {
			selectFileEntry(sortedFiles[firstSelectedFileIndex - 1].file.id);
		} else if (key === 'ArrowDown' && sortedFiles.length > firstSelectedFileIndex + 1) {
			selectFileEntry(sortedFiles[firstSelectedFileIndex + 1].file.id);
		}
	};

	/**
	 * - If arrow-up or arrow-down is pressed, call [changeSelectedFile]
	 * - If enter is pressed, open all currently selected files
	 * - If delete is pressed, delete all currently selected files
	 */
	const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = async (e) => {
		const { key } = e;
		if (key === 'ArrowUp' || key === 'ArrowDown') {
			changeSelectedFile(key);
			e.preventDefault();
		} else if (key === 'Enter') {
			await openSelectedFiles();
			e.preventDefault();
		} else if (key === 'Delete') {
			moveSelectedFilesToTrash();
			e.preventDefault();
		}
	};

	return (
		<Div tabIndex={0} onKeyDown={onKeyDown} className={`show-file-icons`}>
			<HeaderRow>
				<HeaderCell width={COLUMN_WIDTH_ICON} />
				<HeaderCell width={COLUMN_WIDTH_NAME}>Name</HeaderCell>
				<HeaderCell width={COLUMN_WIDTH_TYPE}>Type</HeaderCell>
				<HeaderCell width={COLUMN_WIDTH_SIZE}>Size</HeaderCell>
				<HeaderCell width={COLUMN_WIDTH_LAST_MODIFIED}>Last Modified</HeaderCell>
			</HeaderRow>
			<Content ref={contentRef}>
				{sortedFiles &&
					sortedFiles.map((fileMeta) => {
						const selectAndOpenThisFileEntry = () => selectAndOpenFileEntry(fileMeta.file.id);
						const toggleOrSelectFile: React.MouseEventHandler<HTMLDivElement> = (e) => {
							const withCtrlKey = e.ctrlKey;
							if (withCtrlKey) {
								toggleFileEntrySelection(fileMeta.file.id);
							} else {
								selectFileEntry(fileMeta.file.id);
							}
						};

						return (
							<FileEntry
								key={fileMeta.file.id}
								selected={fileMeta.selected}
								onClick={toggleOrSelectFile}
								onDoubleClick={selectAndOpenThisFileEntry}
								{...fileMeta.file}
							/>
						);
					})}
			</Content>
		</Div>
	);
};

export default DirectoryContent;
