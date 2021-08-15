import { app, ipcMain, IpcMainInvokeEvent } from 'electron';

import {
	FileDragStartArgs,
	FileDragStartReturnValue,
	GetNativeFileIconDataURLArgs,
	GetNativeFileIconDataURLReturnValue,
	NEX_FILEDRAGSTART_CHANNEL,
	NEX_GETNATIVEFILEICONDATAURL_CHANNEL,
} from 'vs/nex/ipc/common/nex';
import { OutlineInsertDriveFileIconPath } from 'vs/nex/assets/outline_insert_drive_file_black_24dp';
import { IpcMainEvent } from 'electron/main';

export function registerNexListeners(): void {
	ipcMain.on(NEX_FILEDRAGSTART_CHANNEL, fileDragStartHandler);
	ipcMain.handle(NEX_GETNATIVEFILEICONDATAURL_CHANNEL, getNativeFileIconDataURLHandler);
}

function fileDragStartHandler(
	e: IpcMainEvent,
	{ fsPath }: FileDragStartArgs,
): FileDragStartReturnValue {
	e.sender.startDrag({
		file: fsPath,
		icon: OutlineInsertDriveFileIconPath,
	});
}

async function getNativeFileIconDataURLHandler(
	_: IpcMainInvokeEvent,
	{ fsPath }: GetNativeFileIconDataURLArgs,
): GetNativeFileIconDataURLReturnValue {
	const icon = await app.getFileIcon(fsPath, { size: 'large' });
	return icon.toDataURL();
}
