import { UriComponents } from 'vs/base/common/uri';
import { ipcRenderer } from 'vs/base/parts/sandbox/electron-sandbox/globals';
import { NEX_FILEDRAGSTART_CHANNEL } from 'vs/nex/ipc/common/nex';

export function onFileDragStart(file: UriComponents): void {
	ipcRenderer.send(NEX_FILEDRAGSTART_CHANNEL, file);
}
