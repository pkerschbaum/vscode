import { createContext } from 'vs/nex/ui/util/create-context';
import { IModelService } from 'vs/editor/common/services/modelService';

const context = createContext<IModelService>('IModelService');
export const useModelService = context.useContextValue;
export const ModelServiceProvider = context.Provider;
