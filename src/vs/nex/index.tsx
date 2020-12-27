import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { CssBaseline, Box } from '@material-ui/core';
import { enUS } from '@material-ui/core/locale';

import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';

import { uriHelper } from 'vs/nex/base/utils/uri-helper';
import { mapFileStatToFile, NexFileSystem } from 'vs/nex/platform/logic/file-system';
import { NexClipboard } from 'vs/nex/platform/logic/clipboard';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { createLogger } from 'vs/nex/base/logger/logger';
import { App } from 'vs/nex/ui/App';
import { createTheme } from 'vs/nex/theme';
import { ThemeProvider } from 'vs/nex/ThemeProvider';
import { dispatch, store } from 'vs/nex/platform/store/store';
import { actions as fileProviderActions } from 'vs/nex/platform/store/file-provider/file-provider.slice';
import { RESOURCES_SCHEME } from 'vs/nex/platform/file-types';
import { useDebounce } from 'vs/nex/platform/store/util/hooks.util';
import { ModeServiceProvider } from 'vs/nex/ui/ModeService.provider';
import { ModelServiceProvider } from 'vs/nex/ui/ModelService.provider';
import { NexFileSystemProvider } from 'vs/nex/ui/NexFileSystem.provider';
import { ClipboardResourcesContext, NexClipboardProvider } from 'vs/nex/ui/NexClipboard.provider';

const logger = createLogger('index');
const theme = createTheme(enUS);

export function createApp(
	modeService: IModeService,
	modelService: IModelService,
	fileSystem: NexFileSystem,
	clipboard: NexClipboard,
) {
	return {
		renderApp: async function (targetContainer: HTMLElement) {
			// load initial directory with contents
			const parsedUri = uriHelper.parseUri(RESOURCES_SCHEME.FILE_SYSTEM, '/home/pkerschbaum');
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
					<Root
						modeService={modeService}
						modelService={modelService}
						fileSystem={fileSystem}
						clipboard={clipboard}
					/>
				</React.StrictMode>,
				targetContainer,
			);
		},
	};
}

const Root: React.FC<{
	modeService: IModeService;
	modelService: IModelService;
	fileSystem: NexFileSystem;
	clipboard: NexClipboard;
}> = ({ modeService, modelService, fileSystem, clipboard }) => {
	/*
	 * Nex uses VS Code to show file and folder icons. The languages registered in the "ModeService"
	 * of VS Code influence how icons get displayed. Even after the first render and paint of Nex, languages
	 * get registered in the ModeService. Every time a language change occurs in the ModeService, we
	 * need to re-render the application in order to show changed icons. That's why we register a listener
	 * for language change events of the mode service, and force a re-render if the listener gets triggered.
	 */
	const [renderCount, setRenderCount] = React.useState(0);
	const debouncedRenderCount = useDebounce(renderCount, 500);

	modeService.onLanguagesMaybeChanged(() => {
		logger.info(
			`modeService.onLanguagesMaybeChanged got triggered ` +
				`--> scheduling re-rendering of entire react tree...`,
		);
		setRenderCount((oldVal) => oldVal + 1);
	});

	return (
		<RenderOnCountChange renderCount={debouncedRenderCount}>
			<ModeServiceProvider value={modeService}>
				<ModelServiceProvider value={modelService}>
					<NexFileSystemProvider value={fileSystem}>
						<NexClipboardProvider value={clipboard}>
							<ClipboardResourcesContext>
								<ThemeProvider theme={theme}>
									<Provider store={store}>
										<CssBaseline />
										<Box css={commonStyles.fullHeight}>
											<App />
										</Box>
									</Provider>
								</ThemeProvider>
							</ClipboardResourcesContext>
						</NexClipboardProvider>
					</NexFileSystemProvider>
				</ModelServiceProvider>
			</ModeServiceProvider>
		</RenderOnCountChange>
	);
};

const RenderOnCountChange: React.FC<{
	renderCount: number;
	children: React.ReactElement;
}> = React.memo(
	({ children }) => {
		logger.info(`(re-)rendering entire react tree...`);
		return children;
	},
	(prevProps, nextProps) => prevProps.renderCount === nextProps.renderCount,
);
