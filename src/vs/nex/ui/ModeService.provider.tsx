import { createContext } from 'vs/nex/ui/utils/create-context';
import { IModeService } from 'vs/editor/common/services/modeService';

const context = createContext<IModeService>('IModeService');
export const useModeService = context.useContextValue;
export const ModeServiceProvider = context.Provider;
