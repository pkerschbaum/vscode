import * as React from 'react';
import { Box, Button, Tooltip } from '@material-ui/core';
import LaunchOutlinedIcon from '@material-ui/icons/LaunchOutlined';
import ContentCopyOutlinedIcon from '@material-ui/icons/ContentCopyOutlined';
import ContentCutOutlinedIcon from '@material-ui/icons/ContentCutOutlined';
import ContentPasteOutlinedIcon from '@material-ui/icons/ContentPasteOutlined';
import EditOutlinedIcon from '@material-ui/icons/EditOutlined';
import DeleteOutlinedIcon from '@material-ui/icons/DeleteOutlined';

import { config } from 'vs/nex/config';
import { styles } from 'vs/nex/ui/ExplorerActions.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { TextBox } from 'vs/nex/ui/elements/TextBox';
import { AddTag } from 'vs/nex/ui/AddTag';
import { CreateFolder } from 'vs/nex/ui/CreateFolder';
import {
	FileForUI,
	useFileProviderDraftPasteState,
	useFileProviderFocusedExplorerId,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { useAddTags } from 'vs/nex/platform/file.hooks';
import { useCreateFolder, usePasteFiles } from 'vs/nex/platform/explorer.hooks';
import { useAddTag, useGetTags, useRemoveTags } from 'vs/nex/platform/tag.hooks';
import { useClipboardResources } from 'vs/nex/NexClipboard.provider';
import { FILE_TYPE } from 'vs/nex/platform/file-types';
import { KEYS } from 'vs/nex/ui/constants';
import { useWindowEvent } from 'vs/nex/ui/utils/events.hooks';

type ExplorerActionsProps = {
	explorerId: string;
	selectedFiles: FileForUI[];
	openSelectedFiles: () => void;
	scheduleDeleteSelectedFiles: () => void;
	copySelectedFiles: () => void;
	cutSelectedFiles: () => void;
	triggerRenameForSelectedFiles: () => void;
};

export const ExplorerActions: React.FC<ExplorerActionsProps> = (props) => {
	const focusedExplorerId = useFileProviderFocusedExplorerId();

	if (focusedExplorerId === undefined) {
		return null;
	}

	return <ExplorerActionsImpl {...props} focusedExplorerId={focusedExplorerId} />;
};

const ExplorerActionsImpl: React.FC<ExplorerActionsProps & { focusedExplorerId: string }> = ({
	explorerId,
	selectedFiles,
	focusedExplorerId,
	openSelectedFiles,
	scheduleDeleteSelectedFiles,
	copySelectedFiles,
	cutSelectedFiles,
	triggerRenameForSelectedFiles,
}) => {
	const draftPasteState = useFileProviderDraftPasteState();

	const { pasteFiles } = usePasteFiles(focusedExplorerId);
	const { createFolder } = useCreateFolder(focusedExplorerId);
	const { getTags } = useGetTags();
	const { addTag } = useAddTag();
	const { addTags } = useAddTags();
	const { removeTags } = useRemoveTags();

	const isFocusedExplorer = explorerId === focusedExplorerId;

	useWindowEvent(
		'keydown',
		!isFocusedExplorer
			? null
			: [{ condition: (e) => e.key === KEYS.F2, handler: triggerRenameForSelectedFiles }],
	);

	const singleFileActionsDisabled = selectedFiles.length !== 1;
	const multipleFilesActionsDisabled = selectedFiles.length < 1;
	const multipleDirectoriesActionsDisabled =
		selectedFiles.length < 1 || selectedFiles.some((file) => file.fileType !== FILE_TYPE.DIRECTORY);

	return (
		<Stack wrap>
			<Button onClick={openSelectedFiles} disabled={singleFileActionsDisabled}>
				<Stack>
					<LaunchOutlinedIcon fontSize="small" />
					Open
				</Stack>
			</Button>
			<Button onClick={copySelectedFiles} disabled={multipleFilesActionsDisabled}>
				<Stack>
					<ContentCopyOutlinedIcon fontSize="small" />
					Copy
				</Stack>
			</Button>
			<Button onClick={cutSelectedFiles} disabled={multipleFilesActionsDisabled}>
				<Stack>
					<ContentCutOutlinedIcon fontSize="small" />
					Cut
				</Stack>
			</Button>
			<Button
				variant={draftPasteState === undefined ? undefined : 'contained'}
				onClick={pasteFiles}
				disabled={draftPasteState === undefined}
			>
				<Stack>
					<ContentPasteOutlinedIcon fontSize="small" />
					Paste
					<PasteInfoBadge />
				</Stack>
			</Button>
			<Button onClick={triggerRenameForSelectedFiles} disabled={singleFileActionsDisabled}>
				<Stack>
					<EditOutlinedIcon fontSize="small" />
					Rename
				</Stack>
			</Button>
			<Button onClick={scheduleDeleteSelectedFiles} disabled={multipleFilesActionsDisabled}>
				<Stack>
					<DeleteOutlinedIcon fontSize="small" />
					Delete
				</Stack>
			</Button>
			<CreateFolder onSubmit={createFolder} />
			{config.featureFlags.tags && (
				<AddTag
					options={Object.entries(getTags()).map(([id, otherValues]) => ({
						...otherValues,
						id,
					}))}
					onValueCreated={(tag) => addTag(tag)}
					onValueChosen={async (chosenTag) => {
						await addTags(
							selectedFiles.map((file) => file.uri),
							[chosenTag.id],
						);
					}}
					onValueDeleted={(tag) => removeTags([tag.id])}
					disabled={multipleDirectoriesActionsDisabled}
				/>
			)}
		</Stack>
	);
};

const PasteInfoBadge: React.FC = () => {
	const clipboardResources = useClipboardResources();
	const draftPasteState = useFileProviderDraftPasteState();

	if (draftPasteState === undefined || clipboardResources.length === 0) {
		return null;
	}

	return (
		<Tooltip
			title={
				<Stack direction="column" alignItems="flex-start" css={commonStyles.text.breakAll}>
					{clipboardResources.map((resource) => (
						<TextBox key={resource.fsPath} fontSize="sm">
							{resource.fsPath}
						</TextBox>
					))}
				</Stack>
			}
			arrow
			disableInteractive={false}
		>
			<Box css={styles.pasteInfoBadge}>
				{draftPasteState.pasteShouldMove ? (
					<ContentCutOutlinedIcon fontSize="small" />
				) : (
					<ContentCopyOutlinedIcon fontSize="small" />
				)}
			</Box>
		</Tooltip>
	);
};
