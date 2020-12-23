import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import { createSelectorHook, useDispatch as useReduxDispatch } from 'react-redux';

import loggerMiddleware from 'vs/nex/platform/store/logger.middleware';
import rootReducer from 'vs/nex/platform/store/reducers';

export const store = configureStore({
	reducer: rootReducer,
	middleware: [loggerMiddleware, ...getDefaultMiddleware()],
});

export type RootState = ReturnType<typeof rootReducer>;
export type RootStore = typeof store;
export type AppDispatch = RootStore['dispatch'];

export const useSelector = createSelectorHook<RootState>();
export const useDispatch = () => useReduxDispatch<AppDispatch>();
export const dispatch = store.dispatch;
