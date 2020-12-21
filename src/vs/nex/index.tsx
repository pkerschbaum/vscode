import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

import { URI } from 'vs/base/common/uri';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';
import { FileMap, FileType, mapFileTypeToFileKind } from 'vs/nex/platform/file-types';
import { NexFileSystem } from 'vs/nex/platform/logic/file-system';
import { store, useSelector } from 'vs/nex/platform/store/store';
import createFileProviderActions from 'vs/nex/platform/store/file-provider/operations';

const mapStateToProps = (
	modeService: IModeService,
	modelService: IModelService,
	fileMap: FileMap,
	cwd: URI,
) => {
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
	modeService,
	modelService,
	fileProviderActions,
}: {
	FileSystem: NexFileSystem;
	modeService: IModeService;
	modelService: IModelService;
	fileProviderActions: ReturnType<typeof createFileProviderActions>;
}) => {
	const cwd = useSelector((state) => state.fileProvider.cwd);
	const fileMap = useSelector((state) => state.fileProvider.files);
	const explorerProps = mapStateToProps(modeService, modelService, fileMap, cwd);
	console.dir(explorerProps);

	return <div>Implement me!</div>;
};

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
	fileProviderActions.changeDirectory('/home/pkerschbaum');

	return {
		renderApp(targetContainer: HTMLElement) {
			targetContainer.style.height = '100%';
			targetContainer.style.width = '100%';

			render(
				<React.StrictMode>
					<Provider store={store}>
						<App
							FileSystem={FileSystem}
							modeService={modeService}
							modelService={modelService}
							fileProviderActions={fileProviderActions}
						/>
					</Provider>
				</React.StrictMode>,
				targetContainer,
			);
		},
	};
}
