import * as React from 'react';
import { Button, Divider, TextField } from '@material-ui/core';

import { URI } from 'vs/base/common/uri';

import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import {
	FileForUI,
	useFileProviderCwd,
	useFileProviderFiles,
	useFileProviderFocusedExplorerId,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useFileActions } from 'vs/nex/platform/file.hooks';
import { useExplorerActions } from 'vs/nex/platform/explorer.hooks';
import { FILE_TYPE } from 'vs/nex/platform/file-types';
import { KEYS, MOUSE_BUTTONS } from 'vs/nex/ui/constants';
import { useWindowEvent, usePrevious } from 'vs/nex/ui/utils/events.hooks';
import { functions } from 'vs/nex/base/utils/functions.util';
import { assertUnreachable } from 'vs/nex/base/utils/types.util';

const EXPLORER_FILTER_INPUT_ID = 'explorer-filter-input';

export const PanelActions: React.FC<{
	explorerId: string;
	filesToShow: FileForUI[];
	idsOfSelectedFiles: string[];
	setIdsOfSelectedFiles: (val: string[]) => void;
	filterInput: string;
	setFilterInput: (val: string) => void;
}> = ({
	explorerId,
	filesToShow,
	idsOfSelectedFiles,
	setIdsOfSelectedFiles,
	filterInput,
	setFilterInput,
}) => {
	const cwd = useFileProviderCwd(explorerId);
	const files = useFileProviderFiles();
	const focusedFileExplorerId = useFileProviderFocusedExplorerId();

	const fileActions = useFileActions();
	const explorerActions = useExplorerActions(explorerId);

	const [cwdInput, setCwdInput] = React.useState(cwd.path);
	const filterInputRef = React.useRef<HTMLDivElement>(null);

	const isFocusedExplorer = explorerId === focusedFileExplorerId;
	const selectedFiles = files.filter((file) => !!idsOfSelectedFiles.find((id) => id === file.id));

	// on mount, and every time the filter input changes, reset selection (just select the first file)
	const prevFilterInput = usePrevious(filterInput);
	React.useEffect(() => {
		if (filterInput !== prevFilterInput && filesToShow.length > 0) {
			setIdsOfSelectedFiles([filesToShow[0].id]);
		}
	}, [filterInput, prevFilterInput, filesToShow, setIdsOfSelectedFiles]);

	function navigateUp() {
		explorerActions.changeDirectory(URI.joinPath(URI.from(cwd), '..').path);
	}

	const openSelectedFiles = () => {
		if (selectedFiles.length === 1 && selectedFiles[0].fileType === FILE_TYPE.DIRECTORY) {
			explorerActions.changeDirectory(selectedFiles[0].uri.path);
		} else {
			selectedFiles
				.filter((selectedFile) => selectedFile.fileType === FILE_TYPE.FILE)
				.forEach((selectedFile) => fileActions.openFile(selectedFile.uri));
		}
	};

	const deleteSelectedFiles = async () => {
		await fileActions.moveFilesToTrash(selectedFiles.map((file) => file.uri));
	};

	const cutOrCopySelectedFiles = (cut: boolean) => () => {
		return fileActions.cutOrCopyFiles(
			selectedFiles.map((file) => file.uri),
			cut,
		);
	};
	const copySelectedFiles = cutOrCopySelectedFiles(false);
	const cutSelectedFiles = cutOrCopySelectedFiles(true);

	/**
	 * - If no file is selected, select the first file
	 * - If at least one file is selected,
	 * -- and arrow up is pressed, select the file above the first currently selected file (if file above exists)
	 * -- and arrow down is pressed, select the file below the first currently selected file (if file below exists)
	 */
	const changeSelectedFile = (
		e: KeyboardEvent,
		key: KEYS['ARROW_UP'] | KEYS['ARROW_DOWN'] | KEYS['PAGE_UP'] | KEYS['PAGE_DOWN'],
	) => {
		e.preventDefault();

		if (filesToShow.length < 1) {
			return;
		}

		if (key === KEYS.ARROW_UP || key === KEYS.ARROW_DOWN) {
			const firstSelectedFileIndex = filesToShow.findIndex((file) =>
				selectedFiles.some((selectedFile) => selectedFile.id === file.id),
			);
			if (selectedFiles.length === 0) {
				setIdsOfSelectedFiles([filesToShow[0].id]);
			} else if (key === KEYS.ARROW_UP && firstSelectedFileIndex > 0) {
				setIdsOfSelectedFiles([filesToShow[firstSelectedFileIndex - 1].id]);
			} else if (key === KEYS.ARROW_DOWN && filesToShow.length > firstSelectedFileIndex + 1) {
				setIdsOfSelectedFiles([filesToShow[firstSelectedFileIndex + 1].id]);
			}
		} else if (key === KEYS.PAGE_UP) {
			setIdsOfSelectedFiles([filesToShow[0].id]);
		} else if (key === KEYS.PAGE_DOWN) {
			setIdsOfSelectedFiles([filesToShow[filesToShow.length - 1].id]);
		} else {
			assertUnreachable(key);
		}
	};

	/*
	 * The following keydown handlers allow navigation of the directory content.
	 *
	 * The first event handler determines whether the event target is any input field. If so, no
	 * navigation handler is executed. This allows the user to type in input fields without triggering
	 * navigation actions.
	 * The only exception of this rule is the filter input field. Navigation actions get triggered even
	 * if the filter field is focused. This allows the user to filter and navigate using the keyboard only.
	 */
	useWindowEvent(
		'keydown',
		!isFocusedExplorer
			? null
			: [
					{
						condition: (e) =>
							e.target instanceof HTMLInputElement && e.target.id !== EXPLORER_FILTER_INPUT_ID,
						handler: functions.noop,
					},
					{ condition: (e) => e.ctrlKey && e.key === KEYS.C, handler: copySelectedFiles },
					{ condition: (e) => e.ctrlKey && e.key === KEYS.X, handler: cutSelectedFiles },
					{ condition: (e) => e.ctrlKey && e.key === KEYS.V, handler: explorerActions.pasteFiles },
					{
						condition: (e) => e.key === KEYS.ARROW_UP,
						handler: (e) => changeSelectedFile(e, KEYS.ARROW_UP),
					},
					{
						condition: (e) => e.key === KEYS.ARROW_DOWN,
						handler: (e) => changeSelectedFile(e, KEYS.ARROW_DOWN),
					},
					{
						condition: (e) => e.key === KEYS.PAGE_UP,
						handler: (e) => changeSelectedFile(e, KEYS.PAGE_UP),
					},
					{
						condition: (e) => e.key === KEYS.PAGE_DOWN,
						handler: (e) => changeSelectedFile(e, KEYS.PAGE_DOWN),
					},
					{ condition: (e) => e.key === KEYS.ENTER, handler: openSelectedFiles },
					{ condition: (e) => e.key === KEYS.DELETE, handler: deleteSelectedFiles },
					{ condition: (e) => e.altKey && e.key === KEYS.ARROW_LEFT, handler: navigateUp },
					{
						condition: (e) =>
							e.key !== KEYS.BACKSPACE &&
							!e.altKey &&
							!e.ctrlKey &&
							filterInputRef.current !== null,
						handler: () => {
							if (filterInputRef.current !== null) {
								filterInputRef.current.focus();
							}
						},
					},
			  ],
	);

	useWindowEvent(
		'auxclick',
		!isFocusedExplorer
			? null
			: [{ condition: (e) => e.button === MOUSE_BUTTONS.BACK, handler: navigateUp }],
	);

	return (
		<>
			<Stack>
				<TextField
					id={EXPLORER_FILTER_INPUT_ID}
					inputRef={filterInputRef}
					InputLabelProps={{ shrink: true }}
					onKeyDown={(e) => {
						/*
						 * For some keys, the default action should be stopped (e.g. in case of ARROW_UP and
						 * ARROW_DOWN, the cursor in the input field jumps to the start/end of the field). The event
						 * must get propagated to the parent, this is needed for navigating the files using the
						 * keyboard. For all other events, we stop propagation to avoid interference with the
						 * keyboard navigation (e.g. CTRL+X would not only cut the text of the input field, but
						 * also the files currently selected)
						 */
						if (
							e.ctrlKey ||
							e.altKey ||
							e.key === KEYS.ARROW_UP ||
							e.key === KEYS.ARROW_DOWN ||
							e.key === KEYS.PAGE_UP ||
							e.key === KEYS.PAGE_DOWN ||
							e.key === KEYS.ENTER
						) {
							e.preventDefault();
						}
					}}
					label="Filter"
					value={filterInput}
					onChange={(e) => {
						const newVal = e.target.value.trimStart();
						setFilterInput(newVal);
						if (newVal === '' && filterInputRef.current !== null) {
							filterInputRef.current.blur();
						}
					}}
				/>
			</Stack>
			<Divider orientation="vertical" flexItem />
			<Stack css={[commonStyles.flex.disableShrink, commonStyles.flex.disableShrinkChildren]}>
				<TextField
					label="Current Directory"
					value={cwdInput}
					onChange={(e) => setCwdInput(e.target.value)}
				/>
				<Button onClick={() => explorerActions.changeDirectory(cwdInput)}>Change CWD</Button>
				<Button onClick={navigateUp}>Up</Button>
			</Stack>
		</>
	);
};
