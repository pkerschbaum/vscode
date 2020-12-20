import { combineReducers } from 'redux';

import { fileProviderReducer } from 'nex/platform/store/file-provider/reducers';

const rootReducer = combineReducers({ fileProvider: fileProviderReducer });

export default rootReducer;

// infer and export shape of the application state
export type AppState = ReturnType<typeof rootReducer>;
