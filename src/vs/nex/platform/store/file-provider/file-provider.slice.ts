import { createAction, createReducer } from '@reduxjs/toolkit';

import { URI, UriComponents } from 'vs/base/common/uri';
import { createLogger } from 'vs/nex/base/logger/logger';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { File, RESOURCES_SCHEME, PASTE_STATUS, FileMap } from 'vs/nex/platform/file-types';

export type FileProviderState = {
	cwd: UriComponents;
	files: FileMap;
	draftPasteState?: {
		pasteShouldMove: boolean;
	};
	pasteProcesses: Array<{
		id: string;
		status: PASTE_STATUS;
		totalSize: number;
		bytesProcessed: number;
	}>;
};

type ChangeCwdPayload = {
	newDir: UriComponents;
	files: File[];
};

type UpdateStatsOfFilesPayload = {
	files: File[];
};

type CutOrCopyFilesPayload = {
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
	cwd: uriHelper.parseUri(RESOURCES_SCHEME.FILE_SYSTEM, '/').toJSON(),
	files: {},
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
	clearDraftPasteState: createAction<void>('DRAFT_PASTE_STATE_CLEARED'),
};
export const reducer = createReducer(INITIAL_STATE, (builder) =>
	builder
		.addCase(actions.changeCwd, (state, action) => {
			const { newDir, files } = action.payload;

			state.cwd = newDir;

			state.files = {};
			for (const file of files) {
				state.files[URI.from(file.uri).toString()] = file;
			}
		})
		.addCase(actions.updateStatsOfFiles, (state, action) => {
			const { files } = action.payload;

			// update existing files, add new files
			for (const file of files) {
				state.files[URI.from(file.uri).toString()] = file;
			}

			// remove files which are not present anymore
			Object.keys(state.files).forEach((stringifiedUri) => {
				const foundElement = files.find((file) => URI.from(file.uri).toString() === stringifiedUri);
				if (!foundElement) {
					delete state.files[stringifiedUri];
				}
			});
		})
		.addCase(actions.cutOrCopyFiles, (state, action) => {
			state.draftPasteState = { pasteShouldMove: action.payload.cut };
		})
		.addCase(actions.addPasteProcess, (state, action) => {
			logger.debug(`STARTED pasteProcess, id: ${action.payload.id}`);
			state.pasteProcesses.push({
				id: action.payload.id,
				status: PASTE_STATUS.STARTED,
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
				pasteProcess.status = PASTE_STATUS.FINISHED;
				logger.debug(`FINISHED pasteProcess, id: ${pasteProcess.id}`);
			} else {
				logger.error('should update paste process, but could not find corresponding one');
			}
		})
		.addCase(actions.clearDraftPasteState, (state) => {
			state.draftPasteState = undefined;
		}),
);
