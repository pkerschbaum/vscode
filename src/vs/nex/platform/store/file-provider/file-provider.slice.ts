import { createAction, createReducer } from '@reduxjs/toolkit';

import * as uuid from 'vs/base/common/uuid';
import { UriComponents } from 'vs/base/common/uri';

import { createLogger } from 'vs/nex/base/logger/logger';
import { PASTE_STATUS, PasteProcess, RESOURCES_SCHEME } from 'vs/nex/platform/file-types';
import { uriHelper } from 'vs/nex/base/utils/uri-helper';

export type FileProviderState = {
	explorers: {
		[id: string]: {
			cwd: UriComponents;
			scheduledToRemove?: boolean;
		};
	};
	focusedExplorerId?: string;
	draftPasteState?: {
		pasteShouldMove: boolean;
	};
	pasteProcesses: PasteProcess[];
};

type AddExplorerPayload = {
	explorerId: string;
	cwd: UriComponents;
};

type RemoveExplorerPayload = {
	explorerId: string;
};

type ChangeCwdPayload = {
	explorerId: string;
	newCwd: UriComponents;
};

type ChangeFocusedExplorerPayload = {
	explorerId: string;
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

const INITIAL_STATE: FileProviderState = {
	explorers: {},
	pasteProcesses: [],
};

const logger = createLogger('file-provider.slice');

export const actions = {
	addExplorer: createAction<AddExplorerPayload>('EXPLORER_ADDED'),
	markExplorerForRemoval: createAction<RemoveExplorerPayload>('EXPLORER_MARKED_FOR_REMOVAL'),
	removeExplorer: createAction<RemoveExplorerPayload>('EXPLORER_REMOVED'),
	changeCwd: createAction<ChangeCwdPayload>('CWD_CHANGED'),
	changeFocusedExplorer: createAction<ChangeFocusedExplorerPayload>('FOCUSED_EXPLORER_CHANGED'),
	cutOrCopyFiles: createAction<CutOrCopyFilesPayload>('FILES_CUT_OR_COPIED'),
	addPasteProcess: createAction<AddPasteProcessPayload>('PASTE_PROCESS_ADDED'),
	updatePasteProcess: createAction<UpdatePasteProcessPayload>('PASTE_PROCESS_UPDATED'),
	finishPasteProcess: createAction<FinishPasteProcessPayload>('PASTE_PROCESS_FINISHED'),
	clearDraftPasteState: createAction<void>('DRAFT_PASTE_STATE_CLEARED'),
};
export const reducer = createReducer(INITIAL_STATE, (builder) =>
	builder
		.addCase(actions.addExplorer, (state, action) => {
			const { explorerId, cwd } = action.payload;

			if (isExplorerIdPresent(state, explorerId)) {
				throw new Error(
					`event "EXPLORER_ADDED" must be dispatched with a new, unused explorerId, ` +
						`but given explorerId is already used! explorerId=${explorerId}`,
				);
			}

			state.explorers[explorerId] = { cwd };
			if (state.focusedExplorerId === undefined) {
				state.focusedExplorerId = explorerId;
			}
		})
		.addCase(actions.markExplorerForRemoval, (state, action) => {
			const { explorerId } = action.payload;

			state.explorers[explorerId].scheduledToRemove = true;

			if (explorerId === state.focusedExplorerId) {
				// focused explorer got removed --> focus another explorer

				const activeExplorer = Object.entries(state.explorers)
					.map(([explorerId, value]) => ({ explorerId, ...value }))
					.find((explorer) => !explorer.scheduledToRemove);

				if (activeExplorer !== undefined) {
					state.focusedExplorerId = activeExplorer.explorerId;
				}
			}
		})
		.addCase(actions.removeExplorer, (state, action) => {
			const { explorerId } = action.payload;

			delete state.explorers[explorerId];
		})
		.addCase(actions.changeCwd, (state, action) => {
			const { explorerId, newCwd } = action.payload;

			if (!isExplorerIdPresent(state, explorerId)) {
				throw new Error(
					`event "CWD_CHANGED" must be dispatched with an existing explorerId, ` +
						`but given explorerId is not present in state! explorerId=${explorerId}`,
				);
			}

			state.explorers[explorerId] = { cwd: newCwd };
		})
		.addCase(actions.changeFocusedExplorer, (state, action) => {
			const { explorerId } = action.payload;

			if (!isExplorerIdPresent(state, explorerId)) {
				throw new Error(
					`event "FOCUSED_EXPLORER_CHANGED" must be dispatched with an existing explorerId, ` +
						`but given explorerId is not present in state! explorerId=${explorerId}`,
				);
			}

			state.focusedExplorerId = explorerId;
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

export function generateExplorerId() {
	return uuid.generateUuid();
}

function isExplorerIdPresent(state: FileProviderState, explorerId: string): boolean {
	return !!Object.keys(state.explorers).find(
		(existingExplorerId) => existingExplorerId === explorerId,
	);
}
