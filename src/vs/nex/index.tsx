import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import ScopedCssBaseline from '@material-ui/core/ScopedCssBaseline';
import { Button, TextField } from '@material-ui/core';
import { enUS } from '@material-ui/core/locale';

import { URI } from 'vs/base/common/uri';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';
import { FileMap, FileType, mapFileTypeToFileKind } from 'vs/nex/platform/file-types';
import { NexFileSystem } from 'vs/nex/platform/logic/file-system';
import { createTheme } from 'vs/nex/theme';
import { ThemeProvider } from 'vs/nex/ThemeProvider';
import { store, useSelector } from 'vs/nex/platform/store/store';
import createFileProviderActions from 'vs/nex/platform/store/file-provider/operations';

const theme = createTheme(enUS);

export function createApp(
	modeService: IModeService,
	modelService: IModelService,
	FileSystem: NexFileSystem,
) {
	const fileProviderActions = createFileProviderActions(
		() => store.getState().fileProvider,
		store.dispatch,
		FileSystem,
	);

	return {
		renderApp: function (targetContainer: HTMLElement) {
			targetContainer.style.height = '100%';
			targetContainer.style.width = '100%';

			render(
				<React.StrictMode>
					<ThemeProvider theme={theme}>
						<Provider store={store}>
							<ScopedCssBaseline>
								<App
									FileSystem={FileSystem}
									modeService={modeService}
									modelService={modelService}
									fileProviderActions={fileProviderActions}
								/>
							</ScopedCssBaseline>
						</Provider>
					</ThemeProvider>
				</React.StrictMode>,
				targetContainer,
			);
		},
	};
}

const App: React.FC<{
	FileSystem: NexFileSystem;
	modeService: IModeService;
	modelService: IModelService;
	fileProviderActions: ReturnType<typeof createFileProviderActions>;
}> = ({ FileSystem, modeService, modelService, fileProviderActions }) => {
	const cwd = useSelector((state) => state.fileProvider.cwd);
	const fileMap = useSelector((state) => state.fileProvider.files);
	const explorerProps = mapStateToProps(modeService, modelService, fileMap, cwd);
	console.dir(explorerProps);

	return <Content fileProviderActions={fileProviderActions} />;
};

const Content: React.FC<{
	fileProviderActions: ReturnType<typeof createFileProviderActions>;
}> = ({ fileProviderActions }) => {
	const [input, setInput] = React.useState('/home/pkerschbaum');

	return (
		<>
			<TextField
				size='small'
				label='cwd'
				value={input}
				onChange={(e) => setInput(e.target.value)}
			/>
			<Button onClick={() => fileProviderActions.changeDirectory(input)}>Change CWD</Button>
		</>
	);
};

function mapStateToProps(
	modeService: IModeService,
	modelService: IModelService,
	fileMap: FileMap,
	cwd: URI,
) {
	const files = Object.values(fileMap).map((file) => {
		const baseName = extractBaseName(file.uri.path);
		const { fileName, extension } = extractNameAndExtension(baseName, file.fileType);
		const fileType = mapFileTypeToFileKind(file.fileType);

		const iconClasses = getIconClasses(modelService, modeService, file.uri, fileType);

		return {
			id: file.id,
			uri: file.uri,
			type: file.fileType,
			extension,
			iconClasses,
			name: fileName,
			size: file.size,
			lastChangedAt: file.lastChangedAt,
		};
	});

	return {
		/* TODO: class "URI" does not have a property suitable to display a "windows-like" full path, the best option is to
		 * use "path" and cut the leading slash. maybe inappropriate for other operating systems or URI schemes (like FTP)
		 */
		cwd: cwd.path.substr(1, cwd.path.length - 1),
		files,
	};
}

function extractBaseName(filePath: string): string {
	const extractFilename = /[^/]+$/g.exec(filePath);
	if (!extractFilename) {
		throw new Error(`could not extract file name from file path. path: ${filePath}`);
	}

	return extractFilename[0];
}

function extractNameAndExtension(
	baseName: string,
	fileType: FileType,
): { fileName: string; extension?: string } {
	let fileName;
	let extension;

	if (fileType === FileType.Directory) {
		fileName = baseName;
	} else {
		const nameParts = baseName.split(/\.(?=[^.]*$)/g);
		if (nameParts[0] === '') {
			// e.g. baseName was ".backup"
			fileName = `.${nameParts[1]}`; // ".backup"
		} else {
			[fileName, extension] = nameParts;
		}
	}

	return { fileName, extension };
}
