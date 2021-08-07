import * as React from 'react';
import { Button, Divider, TextField } from '@material-ui/core';
import { atom, useRecoilState } from 'recoil';

import { URI } from 'vs/base/common/uri';

import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import {
	FileForUI,
	useFileProviderCwd,
	useFileProviderFiles,
	useFileProviderFocusedExplorerId,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useExplorerActions } from 'vs/nex/platform/explorer.hooks';
import { KEYS, MOUSE_BUTTONS } from 'vs/nex/ui/constants';
import { useWindowEvent } from 'vs/nex/ui/utils/events.hooks';
import { functions } from 'vs/nex/base/utils/functions.util';

const EXPLORER_FILTER_INPUT_ID = 'explorer-filter-input';
export const filterInputState = atom({
	key: 'filterInputState',
	default: '',
});

type PanelActionsProps = {
	explorerId: string;
	filesToShow: FileForUI[];
	idsOfSelectedFiles: string[];
	setIdsOfSelectedFiles: (val: string[]) => void;

	openSelectedFiles: () => void;
	scheduleDeleteSelectedFiles: () => void;
	copySelectedFiles: () => void;
	cutSelectedFiles: () => void;
};

export const PanelActions: React.FC<PanelActionsProps> = ({
	explorerId,
	filesToShow,
	idsOfSelectedFiles,
	setIdsOfSelectedFiles,

	openSelectedFiles,
	scheduleDeleteSelectedFiles,
	copySelectedFiles,
	cutSelectedFiles,
}) => {
	const cwd = useFileProviderCwd(explorerId);
	const { files } = useFileProviderFiles(explorerId);
	const focusedFileExplorerId = useFileProviderFocusedExplorerId();

	const explorerActions = useExplorerActions(explorerId);

	const [cwdInput, setCwdInput] = React.useState(cwd.path);
	const filterInputRef = React.useRef<HTMLDivElement>(null);

	const isFocusedExplorer = explorerId === focusedFileExplorerId;
	const selectedFiles = files.filter((file) => !!idsOfSelectedFiles.find((id) => id === file.id));

	function navigateUp() {
		explorerActions.changeDirectory(URI.joinPath(URI.from(cwd), '..').path);
	}

	/*
	 * - If no file is selected, select the first file
	 * - If at least one file is selected,
	 * -- and arrow up is pressed, select the file above the first currently selected file (if file above exists)
	 * -- and arrow down is pressed, select the file below the first currently selected file (if file below exists)
	 */
	function changeSelectedFile(e: KeyboardEvent) {
		e.preventDefault();

		if (filesToShow.length < 1) {
			return;
		}

		if (e.key === KEYS.ARROW_UP || e.key === KEYS.ARROW_DOWN) {
			const firstSelectedFileIndex = filesToShow.findIndex((file) =>
				selectedFiles.some((selectedFile) => selectedFile.id === file.id),
			);
			if (selectedFiles.length === 0) {
				setIdsOfSelectedFiles([filesToShow[0].id]);
			} else if (e.key === KEYS.ARROW_UP && firstSelectedFileIndex > 0) {
				setIdsOfSelectedFiles([filesToShow[firstSelectedFileIndex - 1].id]);
			} else if (e.key === KEYS.ARROW_DOWN && filesToShow.length > firstSelectedFileIndex + 1) {
				setIdsOfSelectedFiles([filesToShow[firstSelectedFileIndex + 1].id]);
			}
		} else if (e.key === KEYS.PAGE_UP) {
			setIdsOfSelectedFiles([filesToShow[0].id]);
		} else if (e.key === KEYS.PAGE_DOWN) {
			setIdsOfSelectedFiles([filesToShow[filesToShow.length - 1].id]);
		} else if (e.key === KEYS.A) {
			setIdsOfSelectedFiles(filesToShow.map((file) => file.id));
		} else {
			throw new Error(`key not implemented. e.key=${e.key}`);
		}
	}

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
						condition: (e) =>
							e.key === KEYS.ARROW_UP ||
							e.key === KEYS.ARROW_DOWN ||
							(e.ctrlKey && e.key === KEYS.A) ||
							(!e.ctrlKey && e.key === KEYS.PAGE_UP) ||
							(!e.ctrlKey && e.key === KEYS.PAGE_DOWN),
						handler: (e) => changeSelectedFile(e),
					},
					{ condition: (e) => e.key === KEYS.ENTER, handler: openSelectedFiles },
					{ condition: (e) => e.key === KEYS.DELETE, handler: scheduleDeleteSelectedFiles },
					{ condition: (e) => e.altKey && e.key === KEYS.ARROW_LEFT, handler: navigateUp },
					{
						condition: (e) =>
							e.key !== KEYS.BACKSPACE &&
							e.key !== KEYS.SHIFT &&
							e.key !== KEYS.TAB &&
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
			<Stack alignItems="flex-end">
				<FilterInput filterResetKey={URI.from(cwd).toString()} filterInputRef={filterInputRef} />
			</Stack>
			<Divider orientation="vertical" flexItem />
			<Stack
				direction="column"
				alignItems="flex-start"
				css={[commonStyles.flex.disableShrink, commonStyles.flex.disableShrinkChildren]}
			>
				<Stack>
					<TextField
						label="Current Directory"
						value={cwdInput}
						onChange={(e) => setCwdInput(e.target.value)}
					/>
					<Button onClick={() => explorerActions.changeDirectory(cwdInput)}>Change CWD</Button>
					<Button onClick={navigateUp}>Up</Button>
				</Stack>
				<Stack>
					<Button onClick={explorerActions.revealCwdInOSExplorer}>
						Reveal in OS File Explorer
					</Button>
				</Stack>
			</Stack>
		</>
	);
};

type FilterInputProps = {
	filterResetKey: string;
	filterInputRef: React.RefObject<HTMLDivElement>;
};

const FilterInput: React.FC<FilterInputProps> = ({ filterResetKey, filterInputRef }) => {
	const [filterInput, setFilterInput] = useRecoilState(filterInputState);

	React.useEffect(
		function resetFilterOnKeyChange() {
			setFilterInput('');
		},
		[filterResetKey, setFilterInput],
	);

	return (
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

				// if input is empty now, blur the input field
				if (newVal === '' && filterInputRef.current !== null) {
					filterInputRef.current.blur();
				}
			}}
		/>
	);
};
