import * as React from 'react';
import { Button } from '@material-ui/core';

import { Stack } from 'vs/nex/ui/layouts/Stack';
import { AddTag } from 'vs/nex/ui/AddTag';
import {
	FileForUI,
	useFileProviderDraftPasteState,
	useFileProviderFocusedExplorerId,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useFileActions } from 'vs/nex/platform/file.hooks';
import { useExplorerActions } from 'vs/nex/platform/explorer.hooks';
import { useTagsActions } from 'vs/nex/platform/tag.hooks';
import { FILE_TYPE } from 'vs/nex/platform/file-types';

type ExplorerActionsProps = {
	selectedFiles: FileForUI[];
	openSelectedFiles: () => void;
	scheduleDeleteSelectedFiles: () => void;
	copySelectedFiles: () => void;
	cutSelectedFiles: () => void;
};

export const ExplorerActions: React.FC<ExplorerActionsProps> = (props) => {
	const focusedExplorerId = useFileProviderFocusedExplorerId();

	if (focusedExplorerId === undefined) {
		return null;
	}

	return <ExplorerActionsImpl {...props} focusedExplorerId={focusedExplorerId} />;
};

const ExplorerActionsImpl: React.FC<ExplorerActionsProps & { focusedExplorerId: string }> = ({
	selectedFiles,
	focusedExplorerId,
	openSelectedFiles,
	scheduleDeleteSelectedFiles,
	copySelectedFiles,
	cutSelectedFiles,
}) => {
	const draftPasteState = useFileProviderDraftPasteState();

	const fileActions = useFileActions();
	const explorerActions = useExplorerActions(focusedExplorerId);
	const tagActions = useTagsActions();

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
				variant={draftPasteState === undefined ? undefined : 'contained'}
				onClick={explorerActions.pasteFiles}
				disabled={draftPasteState === undefined}
			>
				Paste
			</Button>
			<Button onClick={scheduleDeleteSelectedFiles} disabled={multipleFilesActionsDisabled}>
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
