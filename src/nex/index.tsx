import * as React from 'react';
import { render } from 'react-dom';
import styled from 'styled-components';
import { Provider, useSelector } from 'react-redux';

import { URI } from 'vs/base/common/uri';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';
import { propsToArray } from 'nex/base/utils/objects';
import { FileMap, FileType, mapFileTypeToFileKind } from 'nex/platform/file-types';
import { NexFileSystem } from 'nex/platform/logic/file-system';
import store from 'nex/platform/store/store';
import { AppState } from 'nex/platform/store/reducers';
import createFileProviderActions from 'nex/platform/store/file-provider/operations';

import Explorer, { ExplorerProps } from 'nex/views/components/Explorer';
import ProgressBar from 'nex/views/components/ProgressBar';
import GlobalStyle from 'nex/global.styles';

const Div = styled.div`
	height: 100vh;
	width: 100vw;
	font-size: 1rem;

	display: grid;
	align-items: stretch;
	grid-template-rows: min-content min-content auto min-content;
`;

const createMapStateToProps = (modeService: IModeService, modelService: IModelService) => (
	fileMap: FileMap,
	cwd: URI,
) => {
	const files = propsToArray(fileMap).map((file) => {
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
};

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

const App = ({
	FileSystem,
	mapStateToProps,
	fileProviderActions,
}: {
	FileSystem: NexFileSystem;
	mapStateToProps: (fileMap: FileMap, cwd: URI) => Pick<ExplorerProps, 'cwd' | 'files'>;
	fileProviderActions: ReturnType<typeof createFileProviderActions>;
}) => {
	const cwd = useSelector((state: AppState) => state.fileProvider.cwd);
	const fileMap = useSelector((state: AppState) => state.fileProvider.files);
	const explorerProps = mapStateToProps(fileMap, cwd);

	return (
		<Div>
			<GlobalStyle />
			<Explorer
				checkDirectory={FileSystem.checkDirectory}
				changeDirectory={fileProviderActions.changeDirectory}
				changeDirectoryById={fileProviderActions.changeDirectoryById}
				moveFilesToTrash={fileProviderActions.moveFilesToTrash}
				openFile={fileProviderActions.openFile}
				cutOrCopyFiles={fileProviderActions.cutOrCopyFiles}
				pasteAction={fileProviderActions.pasteFiles}
				{...explorerProps}
			/>
			<ProgressBar />
		</Div>
	);
};

export function createApp(
	modeService: IModeService,
	modelService: IModelService,
	FileSystem: NexFileSystem,
) {
	const mapStateToProps = createMapStateToProps(modeService, modelService);
	const fileProviderActions = createFileProviderActions(
		() => store.getState().fileProvider,
		store.dispatch,
		FileSystem,
	);
	fileProviderActions.changeDirectory('C:/data/Drive/Project File Explorer/test-folder');

	return {
		renderApp(targetContainer: HTMLElement) {
			targetContainer.style.height = '100%';
			targetContainer.style.width = '100%';

			render(
				<React.StrictMode>
					<Provider store={store}>
						<App
							FileSystem={FileSystem}
							mapStateToProps={mapStateToProps}
							fileProviderActions={fileProviderActions}
						/>
					</Provider>
				</React.StrictMode>,
				targetContainer,
			);
		},
	};
}
