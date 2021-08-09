import * as React from 'react';
import { Box, Chip, Divider, Skeleton, TextField } from '@material-ui/core';
import { matchSorter } from 'match-sorter';
import { useRecoilState } from 'recoil';

import { UriComponents } from 'vs/base/common/uri';

import { styles } from 'vs/nex/ui/ExplorerPanel.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { TextBox } from 'vs/nex/ui/elements/TextBox';
import { Cell } from 'vs/nex/ui/elements/DataTable/Cell';
import { DataTable } from 'vs/nex/ui/elements/DataTable/DataTable';
import { HeadCell } from 'vs/nex/ui/elements/DataTable/HeadCell';
import { Row } from 'vs/nex/ui/elements/DataTable/Row';
import { TableBody } from 'vs/nex/ui/elements/DataTable/TableBody';
import { TableHead } from 'vs/nex/ui/elements/DataTable/TableHead';
import {
	FileForUI,
	useFileProviderFiles,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useFileActions } from 'vs/nex/platform/file.hooks';
import { useExplorerActions } from 'vs/nex/platform/explorer.hooks';
import { FILE_TYPE } from 'vs/nex/platform/file-types';
import { KEYS } from 'vs/nex/ui/constants';
import { strings } from 'vs/nex/base/utils/strings.util';
import { arrays } from 'vs/nex/base/utils/arrays.util';
import { formatter } from 'vs/nex/base/utils/formatter.util';
import { usePrevious } from 'vs/nex/ui/utils/events.hooks';
import { ExplorerActions } from 'vs/nex/ui/ExplorerActions';
import { filterInputState, PanelActions } from 'vs/nex/ui/PanelActions';

export const ExplorerPanel: React.FC<{ explorerId: string }> = ({ explorerId }) => {
	const { dataAvailable, files } = useFileProviderFiles(explorerId);

	const fileActions = useFileActions();
	const explorerActions = useExplorerActions(explorerId);

	const [idsOfSelectedFiles, setIdsOfSelectedFiles] = React.useState<string[]>([]);
	const [fileToRenameId, setFileToRenameId] = React.useState<string | undefined>();

	const selectedFiles = files.filter((file) => !!idsOfSelectedFiles.find((id) => id === file.id));
	let fileToRename: FileForUI | undefined;
	if (fileToRenameId) {
		fileToRename = files.find((file) => file.id === fileToRenameId);
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

	const scheduleDeleteSelectedFiles = () => {
		fileActions.scheduleMoveFilesToTrash(selectedFiles.map((file) => file.uri));
	};

	const cutOrCopySelectedFiles = (cut: boolean) => () => {
		return fileActions.cutOrCopyFiles(
			selectedFiles.map((file) => file.uri),
			cut,
		);
	};
	const copySelectedFiles = cutOrCopySelectedFiles(false);
	const cutSelectedFiles = cutOrCopySelectedFiles(true);

	const triggerRenameForSelectedFiles = () => {
		if (selectedFiles.length !== 1) {
			return;
		}
		setFileToRenameId(selectedFiles[0].id);
	};

	const fileEditActions = {
		openSelectedFiles,
		scheduleDeleteSelectedFiles,
		copySelectedFiles,
		cutSelectedFiles,
		triggerRenameForSelectedFiles,
	};

	const filesToShowWithTags: FileForUI[] = files.map((file) => ({
		...file,
		tags:
			file.ctime === undefined
				? []
				: fileActions.getTagsOfFile({ uri: file.uri, ctime: file.ctime }),
	}));

	function selectFiles(files: FileForUI[]) {
		setIdsOfSelectedFiles(files.map((file) => file.id));
	}

	function openFileOrDirectory(file: FileForUI) {
		if (file.fileType === FILE_TYPE.DIRECTORY) {
			explorerActions.changeDirectory(file.uri.path);
		} else {
			fileActions.openFile(file.uri);
		}
	}

	async function renameFile(fileToRename: FileForUI, newName: string) {
		await fileActions.renameFile(fileToRename.uri, newName);
		setFileToRenameId(undefined);
	}

	function abortRename() {
		setFileToRenameId(undefined);
	}

	return (
		<Stack css={commonStyles.fullHeight} direction="column" alignItems="stretch" stretchContainer>
			<Stack alignItems="stretch">
				<PanelActions
					explorerId={explorerId}
					filesToShow={filesToShowWithTags}
					idsOfSelectedFiles={idsOfSelectedFiles}
					setIdsOfSelectedFiles={setIdsOfSelectedFiles}
					{...fileEditActions}
				/>
				<Divider orientation="vertical" flexItem />
				<ExplorerActions
					explorerId={explorerId}
					selectedFiles={selectedFiles}
					{...fileEditActions}
				/>
			</Stack>

			<Box css={[commonStyles.fullHeight, commonStyles.flex.shrinkAndFitVertical]}>
				<DataTable>
					<TableHead>
						<HeadCell>
							<TextBox fontSize="sm">Name</TextBox>
						</HeadCell>
						<HeadCell>
							<TextBox fontSize="sm">Size</TextBox>
						</HeadCell>
					</TableHead>

					<TableBody>
						{dataAvailable ? (
							<FilesTableBody
								filesToShow={filesToShowWithTags}
								selectedFiles={selectedFiles}
								selectFiles={selectFiles}
								openFileOrDirectory={openFileOrDirectory}
								fileToRename={fileToRename}
								setFileToRenameId={setFileToRenameId}
								renameFile={renameFile}
								abortRename={abortRename}
								removeTags={fileActions.removeTags}
							/>
						) : (
							<>
								<SkeletonRow />
								<SkeletonRow opacity={0.66} />
								<SkeletonRow opacity={0.33} />
							</>
						)}
					</TableBody>
				</DataTable>
			</Box>
		</Stack>
	);
};

type FilesTableBodyProps = {
	filesToShow: FileForUI[];
	selectedFiles: FileForUI[];
	selectFiles: (files: FileForUI[]) => void;
	openFileOrDirectory: (file: FileForUI) => void;
	fileToRename?: FileForUI;
	setFileToRenameId: (fileId: string) => void;
	renameFile: (fileToRename: FileForUI, newName: string) => void;
	abortRename: () => void;
	removeTags: (files: UriComponents[], tagIds: string[]) => void;
};

const FilesTableBody: React.FC<FilesTableBodyProps> = ({
	filesToShow,
	selectedFiles,
	selectFiles,
	openFileOrDirectory,
	fileToRename,
	renameFile,
	abortRename,
	removeTags,
}) => {
	const [filterInput] = useRecoilState(filterInputState);
	const [fileIdSelectionGotStartedWith, setFileIdSelectionGotStartedWith] = React.useState<
		string | undefined
	>();

	React.useEffect(() => {
		if (selectedFiles.length === 1) {
			setFileIdSelectionGotStartedWith(selectedFiles[0].id);
		}
	}, [selectedFiles]);

	/*
	 * Compute files to show:
	 * - if no filter input is given, just sort the files.
	 *   Directories first and files second. Each section sorted by name.
	 * - otherwise, let "match-sorter" do its job for filtering and sorting.
	 */
	if (strings.isNullishOrEmpty(filterInput)) {
		filesToShow = arrays
			.wrap(filesToShow)
			.stableSort((a, b) => {
				if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
					return -1;
				} else if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
					return 1;
				}
				return 0;
			})
			.stableSort((a, b) => {
				if (a.fileType === FILE_TYPE.DIRECTORY && b.fileType === FILE_TYPE.FILE) {
					return -1;
				} else if (a.fileType === FILE_TYPE.FILE && b.fileType === FILE_TYPE.DIRECTORY) {
					return 1;
				}
				return 0;
			})
			.getValue();
	} else {
		filesToShow = arrays
			.wrap(filesToShow)
			.matchSort(filterInput, {
				// avoid "WORD STARTS WITH" ranking of match-sorter by replacing each blank with another character
				keys: [(file) => file.name.replace(' ', '_')],
				threshold: matchSorter.rankings.CONTAINS,
			})
			.getValue();
	}

	// on mount, and every time the filter input changes, reset selection (just select the first file)
	const prevFilterInput = usePrevious(filterInput);
	const isMounting = prevFilterInput === undefined;
	const filterInputChanged = filterInput !== prevFilterInput;
	React.useEffect(() => {
		if ((isMounting || filterInputChanged) && filesToShow.length > 0) {
			selectFiles([filesToShow[0]]);
		}
	});

	return (
		<>
			{filesToShow.map((fileForRow, idxOfFileForRow) => {
				const fileIsSelected = !!selectedFiles.find((file) => file.id === fileForRow.id);

				return (
					<Row
						key={fileForRow.id}
						onClick={(e) => {
							if (e.ctrlKey) {
								// toggle selection of file which was clicked on
								if (fileIsSelected) {
									selectFiles(
										selectedFiles.filter((selectedFile) => selectedFile.id !== fileForRow.id),
									);
								} else {
									selectFiles([...selectedFiles, fileForRow]);
								}
							} else if (e.shiftKey) {
								// select range of files
								if (fileIdSelectionGotStartedWith === undefined) {
									return;
								}

								const idxSelectionGotStartedWith = filesToShow.findIndex(
									(file) => file.id === fileIdSelectionGotStartedWith,
								);
								let idxSelectFrom = idxSelectionGotStartedWith;
								let idxSelectTo = idxOfFileForRow;
								if (idxSelectTo < idxSelectFrom) {
									// swap values
									const tmp = idxSelectFrom;
									idxSelectFrom = idxSelectTo;
									idxSelectTo = tmp;
								}

								const filesToSelect = filesToShow.filter(
									(_, idx) => idx >= idxSelectFrom && idx <= idxSelectTo,
								);
								selectFiles(filesToSelect);
							} else {
								// no ctrl or shift key pressed --> just select the file which was clicked on
								selectFiles([fileForRow]);
							}
						}}
						onDoubleClick={() => openFileOrDirectory(fileForRow)}
						selected={fileIsSelected}
					>
						<Cell>
							<Stack css={styles.fileIcon} className={fileForRow.iconClasses.join(' ')}>
								{fileToRename && fileToRename.id === fileForRow.id ? (
									<RenameInput
										file={fileForRow}
										onSubmit={(newName) => renameFile(fileForRow, newName)}
										abortRename={abortRename}
									/>
								) : (
									<TextBox fontSize="sm">{formatter.file(fileForRow)}</TextBox>
								)}
								{fileForRow.tags.map((tag) => (
									<Chip
										key={tag.id}
										style={{ backgroundColor: tag.colorHex }}
										variant="outlined"
										size="small"
										label={tag.name}
										onDelete={() => removeTags([fileForRow.uri], [tag.id])}
									/>
								))}
							</Stack>
						</Cell>
						<Cell>
							{fileForRow.fileType === FILE_TYPE.FILE &&
								fileForRow.size !== undefined &&
								formatter.bytes(fileForRow.size)}
						</Cell>
					</Row>
				);
			})}
		</>
	);
};

type RenameInputProps = {
	file: FileForUI;
	onSubmit: (newName: string) => void;
	abortRename: () => void;
};

const RenameInput: React.FC<RenameInputProps> = ({ file, onSubmit, abortRename }) => {
	const [value, setValue] = React.useState(formatter.file(file));

	return (
		<form
			css={commonStyles.fullWidth}
			onSubmit={() => onSubmit(value)}
			onBlur={abortRename}
			onKeyDown={(e) => {
				if (e.key === KEYS.ESC) {
					abortRename();
				}
			}}
		>
			<TextField
				fullWidth
				autoFocus
				label="Rename"
				value={value}
				onChange={(e) => setValue(e.target.value)}
			/>
		</form>
	);
};

type SkeletonRowProps = {
	opacity?: number;
};

const SkeletonRow: React.FC<SkeletonRowProps> = ({ opacity }) => (
	<Row sx={{ opacity }}>
		<Cell>
			<TextBox fontSize="sm">
				<Skeleton variant="text" width={160} />
			</TextBox>
		</Cell>
		<Cell>
			<TextBox fontSize="sm">
				<Skeleton variant="text" width={40} />
			</TextBox>
		</Cell>
	</Row>
);
