import * as React from 'react';
const { useState, useEffect } = React;

import { URI } from 'vs/base/common/uri';
import { FileType } from 'vs/nex/platform/file-types';

import Actions, { ActionsProps } from 'vs/nex/views/components/Actions';
import DirectoryContent from 'vs/nex/views/components/DirectoryContent';
import FolderNavigation, { FolderNavigationProps } from 'vs/nex/views/components/FolderNavigation';

export type ExplorerProps = FolderNavigationProps &
	ExplorerOwnProps &
	Pick<FolderNavigationProps, 'checkDirectory' | 'changeDirectory'> &
	Pick<ActionsProps, 'pasteAction'>;

interface ExplorerOwnProps {
	files: File[];
	cutOrCopyFiles: (files: URI[], cut: boolean) => void;
	changeDirectoryById: (id: string) => void;
	openFile: (uri: URI) => Promise<void>;
	moveFilesToTrash: (uris: URI[]) => void;
}

export interface File {
	id: string;
	uri: URI;
	type: FileType;
	name: string;
	iconClasses: string[];
	extension?: string;
	size?: number;
	lastChangedAt?: number;
}

const Explorer = ({
	files,
	cwd,
	checkDirectory,
	changeDirectory,
	changeDirectoryById,
	moveFilesToTrash,
	openFile,
	cutOrCopyFiles,
	pasteAction,
}: ExplorerProps) => {
	const [idsOfSelectedFiles, updateSelectedFiles] = useState<string[]>([]);

	const isSelected = (file: File) => idsOfSelectedFiles.indexOf(file.id) > -1;
	const resetSelectedFiles = () => updateSelectedFiles([]);
	const selectFileEntry = (fileId: string) => updateSelectedFiles([fileId]);

	const toggleFileEntrySelection = (fileId: string) => {
		const selectedId = idsOfSelectedFiles.find((id) => id === fileId);
		let newSelectedFileIds;
		if (selectedId) {
			newSelectedFileIds = idsOfSelectedFiles.filter((id) => id !== fileId);
		} else {
			newSelectedFileIds = idsOfSelectedFiles.concat(fileId);
		}
		updateSelectedFiles(newSelectedFileIds);
	};

	const cutOrCopyAction = (cut: boolean) => () => {
		const selectedFileUris = files.filter((file) => isSelected(file)).map((file) => file.uri);

		return cutOrCopyFiles(selectedFileUris, cut);
	};

	const openSelectedFiles = async () => {
		const selectedFiles = files.filter((file) => isSelected(file));

		if (selectedFiles.length === 1 && selectedFiles[0].type === FileType.Directory) {
			changeDirectoryById(selectedFiles[0].id);
		} else {
			await Promise.all(
				selectedFiles
					.filter((selectedFile) => selectedFile.type === FileType.File)
					.map((selectedFile) => openFile(selectedFile.uri)),
			);
		}
	};

	const selectAndOpenFileEntry = async (fileId: string) => {
		selectFileEntry(fileId);
		const selectedFile = files.find((file) => file.id === fileId);
		if (selectedFile) {
			if (selectedFile.type === FileType.Directory) {
				changeDirectoryById(selectedFile.id);
			} else {
				await openFile(selectedFile.uri);
			}
		}
	};

	const moveSelectedFilesToTrash = () => {
		const urisToDelete = files
			.filter((file) => isSelected(file))
			.map((selectedFile) => selectedFile.uri);

		moveFilesToTrash(urisToDelete);
	};

	useEffect(() => {
		// when new cwd is provided via prop, i.e. from application state (e.g. because the user navigated into a folder),
		// remove selections on files
		resetSelectedFiles();
	}, [cwd]);

	const fileMetas = files.map((file) => ({
		selected: isSelected(file),
		file,
	}));

	return (
		<>
			<FolderNavigation
				cwd={cwd}
				checkDirectory={checkDirectory}
				changeDirectory={changeDirectory}
			/>
			<Actions
				cutAction={cutOrCopyAction(true)}
				copyAction={cutOrCopyAction(false)}
				pasteAction={pasteAction}
				openAction={openSelectedFiles}
				moveToTrashAction={moveSelectedFilesToTrash}
			/>
			<DirectoryContent
				cwd={cwd}
				fileMetas={fileMetas}
				selectFileEntry={selectFileEntry}
				toggleFileEntrySelection={toggleFileEntrySelection}
				selectAndOpenFileEntry={selectAndOpenFileEntry}
				moveSelectedFilesToTrash={moveSelectedFilesToTrash}
				openSelectedFiles={openSelectedFiles}
			/>
		</>
	);
};

export default Explorer;
