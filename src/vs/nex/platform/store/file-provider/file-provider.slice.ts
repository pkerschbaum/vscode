import { createAction, createReducer } from '@reduxjs/toolkit';

import * as resources from 'vs/base/common/resources';
import { URI, UriComponents } from 'vs/base/common/uri';
import { createLogger } from 'vs/nex/base/logger/logger';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import {
	File,
	FileType,
	FileProviderState,
	ResourceScheme,
	PasteStatus,
	FileMap,
} from 'vs/nex/platform/file-types';
import { IFileStat } from 'vs/platform/files/common/files';

type ChangeCwdPayload = {
	newDir: UriComponents;
	files: IFileStat[];
};

type UpdateStatsOfFilesPayload = {
	files: IFileStat[];
};

type CutOrCopyFilesPayload = {
	files: UriComponents[];
	cut: boolean;
};

type AddPasteProcessPayload = {
	id: string;
	totalSize: number;
};

type UpdatePasteProcessPayload = {
	id: string;
	bytesProcessed: number;
};

type FinishPasteProcessPayload = {
	id: string;
};

const INITIAL_STATE: FileProviderState = {
	cwd: uriHelper.parseUri(ResourceScheme.FileSystem, '/home/pkerschbaum').toJSON(),
	files: {},
	filesToPaste: [],
	pasteShouldMove: false,
	pasteProcesses: [],
};

const logger = createLogger('file-provider.slice');

export const actions = {
	changeCwd: createAction<ChangeCwdPayload>('CWD_CHANGED'),
	updateStatsOfFiles: createAction<UpdateStatsOfFilesPayload>('STATS_OF_FILES_UPDATED'),
	cutOrCopyFiles: createAction<CutOrCopyFilesPayload>('FILES_CUT_OR_COPIED'),
	addPasteProcess: createAction<AddPasteProcessPayload>('PASTE_PROCESS_ADDED'),
	updatePasteProcess: createAction<UpdatePasteProcessPayload>('PASTE_PROCESS_UPDATED'),
	finishPasteProcess: createAction<FinishPasteProcessPayload>('PASTE_PROCESS_FINISHED'),
	resetPasteState: createAction<void>('PASTE_STATE_RESET'),
};
export const reducer = createReducer(INITIAL_STATE, (builder) =>
	builder
		.addCase(actions.changeCwd, (state, action) => {
			const currentCwdTrailingSepRemoved = resources.removeTrailingPathSeparator(
				URI.from(state.cwd),
			);
			const newCwdTrailingSepRemoved = resources.removeTrailingPathSeparator(
				URI.from(action.payload.newDir),
			);

			if (!resources.isEqual(currentCwdTrailingSepRemoved, newCwdTrailingSepRemoved)) {
				state.cwd = action.payload.newDir;
			}

			const dirContents = action.payload.files;
			const files: FileMap = {};
			dirContents.forEach((dirContent) => {
				const fileToAdd = mapFileStatToFile(dirContent);
				if (fileToAdd) {
					files[dirContent.resource.toString()] = fileToAdd;
				}
			});

			state.files = files;
		})
		.addCase(actions.updateStatsOfFiles, (state, action) => {
			const { files } = action.payload;

			// update existing files, add new files
			files.forEach((statOfFile) => {
				let affectedFile = state.files[statOfFile.resource.path];
				if (!affectedFile) {
					// new file
					const newFile = mapFileStatToFile(statOfFile);
					if (!newFile) {
						return;
					}
					affectedFile = newFile;
				}
				affectedFile.size = statOfFile.size;
				affectedFile.lastChangedAt = statOfFile.mtime;

				state.files[affectedFile.uri.path] = affectedFile;
			});

			// remove files which are not present anymore
			Object.keys(state.files).forEach((id) => {
				const foundElement = files.find((file) => file.resource.path === id);
				if (!foundElement) {
					delete state.files[id];
				}
			});
		})
		.addCase(actions.cutOrCopyFiles, (state, action) => {
			state.filesToPaste = action.payload.files;
			state.pasteShouldMove = action.payload.cut;
		})
		.addCase(actions.addPasteProcess, (state, action) => {
			logger.debug(`STARTED pasteProcess, id: ${action.payload.id}`);
			state.pasteProcesses.push({
				id: action.payload.id,
				status: PasteStatus.STARTED,
				totalSize: action.payload.totalSize,
				bytesProcessed: 0,
			});
		})
		.addCase(actions.updatePasteProcess, (state, action) => {
			const pasteProcess = state.pasteProcesses.find((pp) => pp.id === action.payload.id);
			if (pasteProcess) {
				pasteProcess.bytesProcessed = action.payload.bytesProcessed;
				logger.debug(
					`UPDATE pasteProcess, id: ${pasteProcess.id}, bytesRead: ${pasteProcess.bytesProcessed}`,
				);
			} else {
				logger.error('should update paste process, but could not find corresponding one');
			}
		})
		.addCase(actions.finishPasteProcess, (state, action) => {
			const pasteProcess = state.pasteProcesses.find((pp) => pp.id === action.payload.id);
			if (pasteProcess) {
				pasteProcess.status = PasteStatus.FINISHED;
				logger.debug(`FINISHED pasteProcess, id: ${pasteProcess.id}`);
			} else {
				logger.error('should update paste process, but could not find corresponding one');
			}
		})
		.addCase(actions.resetPasteState, (state) => {
			state.filesToPaste = [];
			state.pasteShouldMove = false;
		}),
);

function mapFileStatToFile(dirContent: IFileStat): File | undefined {
	if (dirContent.isSymbolicLink) {
		// TODO: what to do with symbolic links?
		return;
	}

	const fileType = dirContent.isDirectory
		? FileType.Directory
		: !dirContent.isSymbolicLink
		? FileType.File
		: FileType.Unknown;
	return { id: dirContent.resource.toString(), fileType, uri: dirContent.resource };
}
