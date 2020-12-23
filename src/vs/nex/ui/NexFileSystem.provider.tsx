import { createContext } from 'vs/nex/ui/util/create-context';
import { NexFileSystem } from 'vs/nex/platform/logic/file-system';

const context = createContext<NexFileSystem>('NexFileSystem');
export const useNexFileSystem = context.useContextValue;
export const NexFileSystemProvider = context.Provider;
