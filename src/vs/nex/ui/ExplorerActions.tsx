import * as React from 'react';
import { Button } from '@material-ui/core';

import { Stack } from 'vs/nex/ui/layouts/Stack';
import { AddTag } from 'vs/nex/ui/AddTag';
import {
	useFileProviderDraftPasteState,
	useFileProviderFocusedExplorerId,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { FileForUI, useFileActions } from 'vs/nex/platform/file.hooks';
import { useExplorerActions } from 'vs/nex/platform/explorer.hooks';
import { useTagsActions } from 'vs/nex/platform/tag.hooks';
import { FILE_TYPE } from 'vs/nex/platform/file-types';

export const ExplorerActions: React.FC<{
	selectedFiles: FileForUI[];
}> = ({ selectedFiles }) => {
	const draftPasteState = useFileProviderDraftPasteState();
	const focusedExplorerId = useFileProviderFocusedExplorerId();

	const fileActions = useFileActions();
	const explorerActions = useExplorerActions(focusedExplorerId);
	const tagActions = useTagsActions();

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

	const singleFileActionsDisabled = selectedFiles.length !== 1;
	const multipleFilesActionsDisabled = selectedFiles.length < 1;
	const multipleDirectoriesActionsDisabled =
		selectedFiles.length < 1 || selectedFiles.some((file) => file.fileType !== FILE_TYPE.DIRECTORY);

	return (
		<Stack wrap>
			<Button onClick={openSelectedFiles} disabled={singleFileActionsDisabled}>
				Open
			</Button>
			<Button onClick={copySelectedFiles} disabled={multipleFilesActionsDisabled}>
				Copy
			</Button>
			<Button onClick={cutSelectedFiles} disabled={multipleFilesActionsDisabled}>
				Cut
			</Button>
			<Button
				variant={draftPasteState === undefined ? 'outlined' : 'contained'}
				onClick={explorerActions.pasteFiles}
				disabled={draftPasteState === undefined}
			>
				Paste
			</Button>
			<Button onClick={deleteSelectedFiles} disabled={multipleFilesActionsDisabled}>
				Delete
			</Button>
			<AddTag
				options={Object.entries(tagActions.getTags()).map(([id, otherValues]) => ({
					...otherValues,
					id,
				}))}
				onValueCreated={(tag) => tagActions.addTag(tag)}
				onValueChosen={async (chosenTag) => {
					await fileActions.addTags(
						selectedFiles.map((file) => file.uri),
						[chosenTag.id],
					);
				}}
				onValueDeleted={(tag) => tagActions.removeTags([tag.id])}
				disabled={multipleDirectoriesActionsDisabled}
			/>
		</Stack>
	);
};
