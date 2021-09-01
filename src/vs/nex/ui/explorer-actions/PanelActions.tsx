import * as React from 'react';
import { Button, Divider, TextField, Tooltip } from '@material-ui/core';
import ArrowUpwardOutlinedIcon from '@material-ui/icons/ArrowUpwardOutlined';
import FolderOutlinedIcon from '@material-ui/icons/FolderOutlined';

import { URI, UriComponents } from 'vs/base/common/uri';

import { Stack } from 'vs/nex/ui/layouts/Stack';
import {
	useFileProviderCwd,
	useFileProviderFocusedExplorerId,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import {
	useChangeDirectory,
	usePasteFiles,
	useRevealCwdInOSExplorer,
} from 'vs/nex/platform/explorer.hooks';
import {
	useExplorerId,
	useFileIdSelectionGotStartedWith,
	useFiles,
	useFilterInput,
	useIdsOfSelectedFiles,
	useSelectedFiles,
	useSetFilterInput,
	useSetIdsOfSelectedFiles,
} from 'vs/nex/ui/Explorer.context';
import { KEYS, MOUSE_BUTTONS } from 'vs/nex/ui/constants';
import { useWindowEvent } from 'vs/nex/ui/utils/events.hooks';
import { functions } from 'vs/nex/base/utils/functions.util';

const EXPLORER_FILTER_INPUT_ID = 'explorer-filter-input';

type PanelActionsProps = {
	openSelectedFiles: () => void;
	scheduleDeleteSelectedFiles: () => void;
	copySelectedFiles: () => void;
	cutSelectedFiles: () => void;
};

export const PanelActions: React.FC<PanelActionsProps> = ({
	openSelectedFiles,
	scheduleDeleteSelectedFiles,
	copySelectedFiles,
	cutSelectedFiles,
}) => {
	const explorerId = useExplorerId();
	const cwd = useFileProviderCwd(explorerId);
	const focusedExplorerId = useFileProviderFocusedExplorerId();

	const { changeDirectory } = useChangeDirectory(explorerId);
	const { pasteFiles } = usePasteFiles(explorerId);
	const { revealCwdInOSExplorer } = useRevealCwdInOSExplorer(explorerId);

	const filterInputRef = React.useRef<HTMLDivElement>(null);
	const fileIdSelectionGotStartedWith = useFileIdSelectionGotStartedWith();
	const files = useFiles();
	const idsOfSelectedFiles = useIdsOfSelectedFiles();
	const setIdsOfSelectedFiles = useSetIdsOfSelectedFiles();
	const selectedFiles = useSelectedFiles();

	const isFocusedExplorer = explorerId === focusedExplorerId;

	function navigateUp() {
		changeDirectory(URI.joinPath(URI.from(cwd), '..').path);
	}

	function changeSelectedFile(e: KeyboardEvent) {
		e.preventDefault();

		if (files.length < 1) {
			return;
		}

		if (e.key === KEYS.ARROW_UP || e.key === KEYS.ARROW_DOWN) {
			const selectedFilesInfos = files
				.map((file, idx) => ({
					file,
					idx,
					isSelected: selectedFiles.some((selectedFile) => selectedFile.id === file.id),
				}))
				.filter((entry) => entry.isSelected);
			const fileIdSelectionGotStartedWithIndex = selectedFilesInfos.find(
				(sfi) => sfi.file.id === fileIdSelectionGotStartedWith,
			)?.idx;

			if (selectedFilesInfos.length === 0 || fileIdSelectionGotStartedWithIndex === undefined) {
				// If no file is selected, just select the first file
				setIdsOfSelectedFiles([files[0].id]);
				return;
			}

			// If at least one file is selected, gather some infos essential for further processing
			const firstSelectedFileIndex = selectedFilesInfos[0].idx;
			const lastSelectedFileIndex = selectedFilesInfos[selectedFilesInfos.length - 1].idx;
			const selectionWasStartedDownwards =
				fileIdSelectionGotStartedWithIndex === firstSelectedFileIndex;

			if (!e.shiftKey) {
				if (e.key === KEYS.ARROW_UP && fileIdSelectionGotStartedWithIndex > 0) {
					/*
					 * UP without shift key is pressed
					 * --> select the file above the file which got selected first (if file above exists)
					 */
					setIdsOfSelectedFiles([files[fileIdSelectionGotStartedWithIndex - 1].id]);
				} else if (
					e.key === KEYS.ARROW_DOWN &&
					files.length > fileIdSelectionGotStartedWithIndex + 1
				) {
					/*
					 * DOWN without shift key is pressed
					 * --> select the file below the file which got selected first (if file below exists)
					 */
					setIdsOfSelectedFiles([files[fileIdSelectionGotStartedWithIndex + 1].id]);
				}
			} else {
				if (e.key === KEYS.ARROW_UP) {
					if (selectedFilesInfos.length > 1 && selectionWasStartedDownwards) {
						/*
						 * SHIFT+UP is pressed, multiple files are selected, and the selection was started downwards.
						 * --> The user wants to remove the last file from the selection.
						 */
						setIdsOfSelectedFiles(
							idsOfSelectedFiles.filter(
								(id) => id !== selectedFilesInfos[selectedFilesInfos.length - 1].file.id,
							),
						);
					} else if (firstSelectedFileIndex > 0) {
						/*
						 * SHIFT+UP is pressed and the selection was started upwards. Or, there is only one file selected at the moment.
						 * --> The user wants to add the file above all selected files to the selection.
						 */
						setIdsOfSelectedFiles([files[firstSelectedFileIndex - 1].id, ...idsOfSelectedFiles]);
					}
				} else if (e.key === KEYS.ARROW_DOWN) {
					if (selectedFilesInfos.length > 1 && !selectionWasStartedDownwards) {
						/*
						 * SHIFT+DOWN is pressed, multiple files are selected, and the selection was started upwards.
						 * --> The user wants to remove the first file from the selection.
						 */
						setIdsOfSelectedFiles(
							idsOfSelectedFiles.filter((id) => id !== selectedFilesInfos[0].file.id),
						);
					} else if (files.length > lastSelectedFileIndex + 1) {
						/*
						 * SHIFT+DOWN is pressed and the selection was started downwards. Or, there is only one file selected at the moment.
						 * --> The user wants to add the file after all selected files to the selection.
						 */
						setIdsOfSelectedFiles([...idsOfSelectedFiles, files[lastSelectedFileIndex + 1].id]);
					}
				}
			}
		} else if (e.key === KEYS.PAGE_UP) {
			setIdsOfSelectedFiles([files[0].id]);
		} else if (e.key === KEYS.PAGE_DOWN) {
			setIdsOfSelectedFiles([files[files.length - 1].id]);
		} else if (e.key === KEYS.A) {
			setIdsOfSelectedFiles(files.map((file) => file.id));
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
					{ condition: (e) => e.ctrlKey && e.key === KEYS.V, handler: pasteFiles },
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
							e.key !== KEYS.F2 &&
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
				<FilterInput filterInputRef={filterInputRef} explorerId={explorerId} />
			</Stack>
			<Divider orientation="vertical" flexItem />
			<Stack alignItems="flex-end">
				<Stack>
					<CwdInput cwd={cwd} onSubmit={changeDirectory} />
					<Button onClick={navigateUp}>
						<Stack>
							<ArrowUpwardOutlinedIcon fontSize="small" />
							Up
						</Stack>
					</Button>
					<Tooltip title="Reveal in OS File Explorer">
						<Button onClick={revealCwdInOSExplorer}>
							<Stack>
								<FolderOutlinedIcon fontSize="small" />
								Reveal
							</Stack>
						</Button>
					</Tooltip>
				</Stack>
			</Stack>
		</>
	);
};

type CwdInputProps = {
	cwd: UriComponents;
	onSubmit: (newCwdPath: string) => void;
};

const CwdInput: React.FC<CwdInputProps> = ({ cwd, onSubmit }) => {
	const [cwdInput, setCwdInput] = React.useState(cwd.path);

	return (
		<form onSubmit={() => onSubmit(cwdInput)}>
			<TextField
				label="Current Directory"
				value={cwdInput}
				onChange={(e) => setCwdInput(e.target.value)}
			/>
		</form>
	);
};

type FilterInputProps = {
	filterInputRef: React.RefObject<HTMLDivElement>;
	explorerId: string;
};

const FilterInput: React.FC<FilterInputProps> = ({ filterInputRef, explorerId }) => {
	const filterInput = useFilterInput();
	const setFilterInput = useSetFilterInput();

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
