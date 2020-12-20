import { createStore } from 'redux';
import { devToolsEnhancer } from 'redux-devtools-extension';

import rootReducer from 'vs/nex/platform/store/reducers';

const store = createStore(
	rootReducer,
	devToolsEnhancer({}),
);
export type GetStateType = typeof store.getState;
export type DispatchType = typeof store.dispatch;

export default store;
