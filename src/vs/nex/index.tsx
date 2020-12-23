import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { ScopedCssBaseline } from '@material-ui/core';
import { enUS } from '@material-ui/core/locale';

import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import {
	mapFileStatToFile,
	NexFileSystem as nexFileSystem,
} from 'vs/nex/platform/logic/file-system';
import { createTheme } from 'vs/nex/theme';
import { ThemeProvider } from 'vs/nex/ThemeProvider';
import { dispatch, store } from 'vs/nex/platform/store/store';
import { App } from 'vs/nex/ui/App';
import { actions as fileProviderActions } from 'vs/nex/platform/store/file-provider/file-provider.slice';
import { URI } from 'vs/base/common/uri';
import { ModeServiceProvider } from 'vs/nex/ui/ModeService.provider';
import { ModelServiceProvider } from 'vs/nex/ui/ModelService.provider';
import { NexFileSystemProvider } from 'vs/nex/ui/NexFileSystem.provider';

const theme = createTheme(enUS);

export function createApp(
	modeService: IModeService,
	modelService: IModelService,
	fileSystem: nexFileSystem,
) {
	return {
		renderApp: async function (targetContainer: HTMLElement) {
			// load initial directory with contents
			const parsedUri = URI.file('/home/pkerschbaum');
			const stats = await fileSystem.resolve(parsedUri, { resolveMetadata: true });
			if (!stats.isDirectory) {
				throw Error(
					`could not set intial directory, reason: uri is not a valid directory. uri: ${parsedUri}`,
				);
			}
			const children = stats.children ?? [];
			dispatch(
				fileProviderActions.changeCwd({
					newDir: parsedUri.toJSON(),
					files: children.map(mapFileStatToFile),
				}),
			);

			// render app
			render(
				<React.StrictMode>
					<ModeServiceProvider value={modeService}>
						<ModelServiceProvider value={modelService}>
							<NexFileSystemProvider value={fileSystem}>
								<ThemeProvider theme={theme}>
									<Provider store={store}>
										<ScopedCssBaseline>
											<App />
										</ScopedCssBaseline>
									</Provider>
								</ThemeProvider>
							</NexFileSystemProvider>
						</ModelServiceProvider>
					</ModeServiceProvider>
				</React.StrictMode>,
				targetContainer,
			);
		},
	};
}
