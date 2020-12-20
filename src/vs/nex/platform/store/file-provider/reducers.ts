import produce from 'immer';
import { DeepWritable } from 'ts-essentials';

import * as resources from 'vs/base/common/resources';
import { URI } from 'vs/base/common/uri';
import { IFileStat } from 'vs/platform/files/common/files';
import { File, FileProviderActionTypes, FileType, ResourceScheme, FileProviderState, PasteStatus } from 'vs/nex/platform/file-types';
import { FileProviderActions } from 'vs/nex/platform/store/file-provider/actions';
import { logger } from 'vs/nex/base/logger/logger';

const initialState: FileProviderState = {
	scheme: ResourceScheme.FileSystem,
	cwd: URI.file('/C:/'),
	files: {
		[URI.file('/C:/foo.txt').path]: {
			id: URI.file('/C:/foo.txt').path,
			fileType: FileType.File,
			uri: URI.file('/C:/foo.txt'),
			size: 0,
			lastChangedAt: 0,
		},
		[URI.file('/C:/bar.docx').path]: {
			id: URI.file('/C:/bar.docx').path,
			fileType: FileType.File,
			uri: URI.file('/C:/bar.docx'),
			size: 0,
			lastChangedAt: 0,
		},
	},
	filesToPaste: [],
	pasteShouldMove: false,
	pasteProcesses: [],
};

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
	return { id: dirContent.resource.path, fileType, uri: dirContent.resource };
}

export const fileProviderReducer: (base: FileProviderState | undefined, action: FileProviderActions) => FileProviderState = produce((state: DeepWritable<FileProviderState>, action: FileProviderActions) => {
	switch (action.type) {
		case FileProviderActionTypes.CHANGE_CWD: {

			const currentCwdTrailingSepRemoved = resources.removeTrailingPathSeparator(state.cwd);
			const newCwdTrailingSepRemoved = resources.removeTrailingPathSeparator(action.payload.newDir);

			if (!resources.isEqual(currentCwdTrailingSepRemoved, newCwdTrailingSepRemoved)) {
				state.cwd = action.payload.newDir;
			}

			const dirContents = action.payload.files;
			const files: { [key: string]: File } = {};
			dirContents.forEach(dirContent => {
				const fileToAdd = mapFileStatToFile(dirContent);
				if (fileToAdd) {
					files[dirContent.resource.path] = fileToAdd;
				}
			});

			state.files = files;
			break;
		}

		case FileProviderActionTypes.UPDATE_FILES: {
			const { files } = action.payload;

			// update existing files, add new files
			files.forEach(statOfFile => {
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
			Object.keys(state.files).forEach(id => {
				const foundElement = files.find(file => file.resource.path === id);
				if (!foundElement) {
					delete state.files[id];
				}
			});

			break;
		}

		case FileProviderActionTypes.CUT_OR_COPY_FILES: {
			state.filesToPaste = action.payload.files;
			state.pasteShouldMove = action.payload.cut;
			break;
		}

		case FileProviderActionTypes.ADD_PASTE_PROCESS: {
			logger.debug(`STARTED pasteProcess, id: ${action.payload.id}`);
			state.pasteProcesses.push({
				id: action.payload.id,
				status: PasteStatus.STARTED,
				totalSize: action.payload.totalSize,
				bytesProcessed: 0,
			});
			break;
		}

		case FileProviderActionTypes.UPDATE_PASTE_PROCESS: {
			const pasteProcess = state.pasteProcesses.find(pp => pp.id === action.payload.id);
			if (pasteProcess) {
				pasteProcess.bytesProcessed = action.payload.bytesProcessed;
				logger.debug(`UPDATE pasteProcess, id: ${pasteProcess.id}, bytesRead: ${pasteProcess.bytesProcessed}`);
			} else {
				logger.error('should update paste process, but could not find corresponding one');
			}
			break;
		}

		case FileProviderActionTypes.FINISH_PASTE_PROCESS: {
			const pasteProcess = state.pasteProcesses.find(pp => pp.id === action.payload.id);
			if (pasteProcess) {
				pasteProcess.status = PasteStatus.FINISHED;
				logger.debug(`FINISHED pasteProcess, id: ${pasteProcess.id}`);
			} else {
				logger.error('should update paste process, but could not find corresponding one');
			}
			break;
		}

		case FileProviderActionTypes.RESET_PASTE_STATE: {
			state.filesToPaste = [];
			state.pasteShouldMove = false;
			break;
		}
	}
}, initialState);
