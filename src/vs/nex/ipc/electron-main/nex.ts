import { ipcMain } from 'electron';

import { URI, UriComponents } from 'vs/base/common/uri';
import { NEX_FILEDRAGSTART_CHANNEL } from 'vs/nex/ipc/common/nex';
import { OutlineInsertDriveFileIconPath } from 'vs/nex/assets/outline_insert_drive_file_black_24dp';

export function registerNexListener(): void {
	ipcMain.on(NEX_FILEDRAGSTART_CHANNEL, (e, uri: UriComponents) => {
		e.sender.startDrag({
			file: URI.from(uri).fsPath,
			icon: OutlineInsertDriveFileIconPath,
		});
	});
}
