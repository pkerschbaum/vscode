import { ipcRenderer } from 'vs/base/parts/sandbox/electron-sandbox/globals';
import {
	FileDragStartArgs,
	FileDragStartReturnValue,
	GetNativeFileIconDataURLArgs,
	GetNativeFileIconDataURLReturnValue,
	NEX_FILEDRAGSTART_CHANNEL,
	NEX_GETNATIVEFILEICONDATAURL_CHANNEL,
} from 'vs/nex/ipc/common/nex';

export function onFileDragStart(args: FileDragStartArgs): FileDragStartReturnValue {
	ipcRenderer.send(NEX_FILEDRAGSTART_CHANNEL, args);
}

export async function getNativeFileIconDataURL(
	args: GetNativeFileIconDataURLArgs,
): GetNativeFileIconDataURLReturnValue {
	return ipcRenderer.invoke(NEX_GETNATIVEFILEICONDATAURL_CHANNEL, args);
}
