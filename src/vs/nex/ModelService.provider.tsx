import { createContext } from 'vs/nex/ui/utils/create-context';
import { IModelService } from 'vs/editor/common/services/modelService';

const context = createContext<IModelService>('IModelService');
export const useModelService = context.useContextValue;
export const ModelServiceProvider = context.Provider;
