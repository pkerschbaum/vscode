import { createAction, createReducer } from '@reduxjs/toolkit';

import { URI, UriComponents } from 'vs/base/common/uri';
import * as uuid from 'vs/base/common/uuid';

import { createLogger } from 'vs/nex/base/logger/logger';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import {
	File,
	RESOURCES_SCHEME,
	PASTE_STATUS,
	FileMap,
	PasteProcess,
} from 'vs/nex/platform/file-types';

export type FileProviderState = {
	explorers: {
		[id: string]: {
			cwd: UriComponents;
			urisOfFilesInCwd: UriComponents[];
		};
	};
	focusedExplorerId: string;
	files: FileMap;
	draftPasteState?: {
		pasteShouldMove: boolean;
	};
	pasteProcesses: PasteProcess[];
};

type ChangeCwdPayload = {
	explorerId: string;
	newDir: UriComponents;
	urisOfFilesInCwd: UriComponents[];
};

type UpdateStatsOfFilesPayload = {
	files: File[];
};

type CutOrCopyFilesPayload = {
	cut: boolean;
};

type AddPasteProcessPayload = Omit<PasteProcess, 'status'> & {
	destinationFolder: UriComponents;
};

type UpdatePasteProcessPayload = {
	id: string;
	bytesProcessed: number;
};

type FinishPasteProcessPayload = {
	id: string;
};

const initialExplorerId = uuid.generateUuid();
const INITIAL_STATE: FileProviderState = {
	explorers: {
		[initialExplorerId]: {
			cwd: uriHelper.parseUri(RESOURCES_SCHEME.FILE_SYSTEM, '/').toJSON(),
			urisOfFilesInCwd: [],
		},
	},
	focusedExplorerId: initialExplorerId,
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
			const { explorerId, newDir, urisOfFilesInCwd } = action.payload;

			state.explorers[explorerId] = { cwd: newDir, urisOfFilesInCwd };
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
			state.pasteProcesses.push({ ...action.payload, status: PASTE_STATUS.STARTED });
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
