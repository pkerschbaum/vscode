import * as React from 'react';
import { Box, Breadcrumbs, Button, Chip, Skeleton, TextField } from '@mui/material';

import { URI } from 'vs/base/common/uri';
import { posix, win32 } from 'vs/base/common/path';
import { isWindows } from 'vs/base/common/platform';

import { styles } from 'vs/nex/ui/explorer-panel/ExplorerPanel.styles';
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
	useFileProviderCwd,
	useFileProviderFiles,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import {
	useCutOrCopyFiles,
	useOpenFile,
	useRemoveTags,
	useRenameFile,
	useScheduleMoveFilesToTrash,
} from 'vs/nex/platform/file.hooks';
import { useChangeDirectory } from 'vs/nex/platform/explorer.hooks';
import {
	useFileIdSelectionGotStartedWith,
	useFilesToShow,
	useFileToRename,
	useSelectedFiles,
	useSetFileToRenameId,
	useSetIdsOfSelectedFiles,
} from 'vs/nex/ui/Explorer.context';
import { FILE_TYPE } from 'vs/nex/platform/file-types';
import { KEYS } from 'vs/nex/ui/constants';
import { strings } from 'vs/nex/base/utils/strings.util';
import { formatter } from 'vs/nex/base/utils/formatter.util';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { ExplorerActions } from 'vs/nex/ui/explorer-actions/ExplorerActions';
import { getNativeFileIconDataURL, onFileDragStart } from 'vs/nex/ipc/electron-sandbox/nex';

const USE_NATIVE_ICON_FOR_REGEX = /(?:exe|ico|dll)/i;

export const ExplorerPanel: React.FC<{ explorerId: string }> = ({ explorerId }) => {
	const cwd = useFileProviderCwd(explorerId);
	const { dataAvailable } = useFileProviderFiles(explorerId);

	const { changeDirectory } = useChangeDirectory(explorerId);
	const { openFile } = useOpenFile();
	const { scheduleMoveFilesToTrash } = useScheduleMoveFilesToTrash();
	const { cutOrCopyFiles } = useCutOrCopyFiles();
	const { renameFile } = useRenameFile();

	const setFileToRenameId = useSetFileToRenameId();

	const selectedFiles = useSelectedFiles();

	const openSelectedFiles = () => {
		if (selectedFiles.length === 1 && selectedFiles[0].fileType === FILE_TYPE.DIRECTORY) {
			changeDirectory(selectedFiles[0].uri.path);
		} else {
			selectedFiles
				.filter((selectedFile) => selectedFile.fileType === FILE_TYPE.FILE)
				.forEach((selectedFile) => openFile(selectedFile.uri));
		}
	};

	const scheduleDeleteSelectedFiles = () => {
		scheduleMoveFilesToTrash(selectedFiles.map((file) => file.uri));
	};

	const cutOrCopySelectedFiles = (cut: boolean) => () => {
		return cutOrCopyFiles(
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

	function openFileOrDirectory(file: FileForUI) {
		if (file.fileType === FILE_TYPE.DIRECTORY) {
			changeDirectory(file.uri.path);
		} else {
			openFile(file.uri);
		}
	}

	async function renameFileHandler(fileToRename: FileForUI, newName: string) {
		await renameFile(fileToRename.uri, newName);
		setFileToRenameId(undefined);
	}

	function abortRename() {
		setFileToRenameId(undefined);
	}

	const cwdStringifiedParts = URI.from(cwd)
		.fsPath.split(isWindows ? win32.sep : posix.sep)
		.filter(strings.isNotNullishOrEmpty);
	const cwdRootPart = uriHelper.parseUri(cwd.scheme, cwdStringifiedParts[0]);

	return (
		<Stack css={commonStyles.fullHeight} direction="column" alignItems="stretch" stretchContainer>
			<ExplorerActions {...fileEditActions} />

			<Stack
				direction="column"
				alignItems="stretch"
				css={[commonStyles.fullHeight, commonStyles.flex.shrinkAndFitVertical]}
			>
				<Breadcrumbs css={styles.cwdBreadcrumbs}>
					{cwdStringifiedParts.map((pathPart, idx) => {
						const isFirstPart = idx === 0;
						const isLastPart = idx === cwdStringifiedParts.length - 1;
						const pathPartFormatted = isFirstPart
							? `${pathPart[0].toLocaleUpperCase()}${pathPart.slice(1)}`
							: pathPart;

						function handleClick() {
							changeDirectory(
								URI.joinPath(
									cwdRootPart,
									...(isFirstPart ? ['/'] : cwdStringifiedParts.slice(1, idx + 1)),
								).path,
							);
						}

						return !isLastPart ? (
							<Button variant="outlined" color="inherit" onClick={handleClick}>
								{pathPartFormatted}
							</Button>
						) : (
							<TextBox fontSize="sm" boxProps={{ component: 'div' }}>
								{pathPartFormatted}
							</TextBox>
						);
					})}
				</Breadcrumbs>

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
								openFileOrDirectory={openFileOrDirectory}
								renameFile={renameFileHandler}
								abortRename={abortRename}
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
			</Stack>
		</Stack>
	);
};

type FilesTableBodyProps = {
	openFileOrDirectory: (file: FileForUI) => void;
	renameFile: (fileToRename: FileForUI, newName: string) => void;
	abortRename: () => void;
};

const FilesTableBody: React.FC<FilesTableBodyProps> = ({
	openFileOrDirectory,
	renameFile,
	abortRename,
}) => {
	const filesToShow = useFilesToShow();

	return (
		<>
			{filesToShow.map((fileForRow, idxOfFileForRow) => (
				<FilesTableRow
					key={fileForRow.id}
					filesToShow={filesToShow}
					openFileOrDirectory={openFileOrDirectory}
					renameFile={renameFile}
					abortRename={abortRename}
					fileForRow={fileForRow}
					idxOfFileForRow={idxOfFileForRow}
				/>
			))}
		</>
	);
};

type FilesTableRowProps = {
	filesToShow: FileForUI[];
	openFileOrDirectory: (file: FileForUI) => void;
	renameFile: (fileToRename: FileForUI, newName: string) => void;
	abortRename: () => void;

	fileForRow: FileForUI;
	idxOfFileForRow: number;
};

const FilesTableRow: React.FC<FilesTableRowProps> = ({
	filesToShow,
	openFileOrDirectory,
	renameFile,
	abortRename,
	fileForRow,
	idxOfFileForRow,
}) => {
	const selectedFiles = useSelectedFiles();
	const fileToRename = useFileToRename();
	const fileIdSelectionGotStartedWith = useFileIdSelectionGotStartedWith();
	const setIdsOfSelectedFiles = useSetIdsOfSelectedFiles();
	const { removeTags } = useRemoveTags();

	function selectFiles(files: FileForUI[]) {
		setIdsOfSelectedFiles(files.map((file) => file.id));
	}

	const [nativeIconDataURL, setNativeIconDataURL] = React.useState<string | undefined>();

	const fsPath = URI.from(fileForRow.uri).fsPath;
	const extension = fileForRow.extension;
	React.useEffect(
		function fetchIcon() {
			if (
				strings.isNullishOrEmpty(fsPath) ||
				strings.isNullishOrEmpty(extension) ||
				!USE_NATIVE_ICON_FOR_REGEX.test(extension)
			) {
				return;
			}

			async function doFetchIcon() {
				const icon = await getNativeFileIconDataURL({ fsPath });
				setNativeIconDataURL(icon);
			}
			doFetchIcon();
		},
		[fsPath, extension],
	);

	const fileIsSelected = !!selectedFiles.find((file) => file.id === fileForRow.id);

	return (
		<Row
			key={fileForRow.id}
			draggable
			onDragStart={() => onFileDragStart({ fsPath: URI.from(fileForRow.uri).fsPath })}
			onClick={(e) => {
				if (e.ctrlKey) {
					// toggle selection of file which was clicked on
					if (fileIsSelected) {
						selectFiles(selectedFiles.filter((selectedFile) => selectedFile.id !== fileForRow.id));
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
				<Stack>
					<Stack
						css={[commonStyles.fullWidth, styles.fileIcon]}
						className={nativeIconDataURL ? undefined : fileForRow.iconClasses.join(' ')}
					>
						{nativeIconDataURL && (
							<Box css={styles.icon}>
								<img
									src={nativeIconDataURL}
									alt="application icon"
									style={{ maxHeight: '100%', maxWidth: '100%' }}
								/>
							</Box>
						)}
						{fileToRename && fileToRename.id === fileForRow.id ? (
							<RenameInput
								file={fileForRow}
								onSubmit={(newName) => renameFile(fileForRow, newName)}
								abortRename={abortRename}
							/>
						) : (
							<TextBox fontSize="sm">{formatter.file(fileForRow)}</TextBox>
						)}
					</Stack>

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
