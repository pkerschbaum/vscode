export type FileDragStartArgs = { fsPath: string };
export type FileDragStartReturnValue = void;
export const NEX_FILEDRAGSTART_CHANNEL = 'vscode:nex:fileDragStart';

export type GetNativeFileIconDataURLArgs = { fsPath: string };
export type GetNativeFileIconDataURLReturnValue = Promise<string | undefined>;
export const NEX_GETNATIVEFILEICONDATAURL_CHANNEL = 'vscode:nex:getNativeFileIcon_dataURL';
