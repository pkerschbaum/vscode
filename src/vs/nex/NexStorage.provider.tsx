import { createContext } from 'vs/nex/ui/utils/create-context';
import { NexStorage } from 'vs/nex/platform/logic/storage';

const context = createContext<NexStorage>('NexStorage');
export const useNexStorage = context.useContextValue;
export const NexStorageProvider = context.Provider;
