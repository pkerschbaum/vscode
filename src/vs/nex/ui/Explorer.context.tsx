import * as React from 'react';
import { matchSorter } from 'match-sorter';

import { arrays } from 'vs/nex/base/utils/arrays.util';
import { strings } from 'vs/nex/base/utils/strings.util';
import { FILE_TYPE } from 'vs/nex/platform/file-types';
import { useGetTagsOfFile } from 'vs/nex/platform/file.hooks';
import {
	FileForUI,
	useFileProviderFiles,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';
import { usePrevious } from 'vs/nex/ui/utils/events.hooks';

type ExplorerContextValue = {
	values: {
		filterInput: string;
		fileIdSelectionGotStartedWith?: string;
		idsOfSelectedFiles: string[];
		fileToRenameId?: string;

		// computed/pass-through values
		explorerId: string;
		files: FileForUI[];
		filesToShow: FileForUI[];
		selectedFiles: FileForUI[];
	};
	actions: {
		setFilterInput: (newFilterInput: string) => void;
		setFileIdSelectionGotStartedWith: (newFileIdSelectionGotStartedWith: string) => void;
		setIdsOfSelectedFiles: (newIdsOfSelectedFiles: string[]) => void;
		setFileToRenameId: (newFileToRenameId?: string) => void;
	};
};

const ExplorerContext = React.createContext<ExplorerContextValue | undefined>(undefined);

type ExplorerContextProviderProps = {
	explorerId: string;
	children: React.ReactElement;
};

export const ExplorerContextProvider: React.FC<ExplorerContextProviderProps> = ({
	explorerId,
	children,
}) => {
	const { files } = useFileProviderFiles(explorerId);
	const { getTagsOfFile } = useGetTagsOfFile();

	const [filterInput, setFilterInput] = React.useState('');
	const [fileIdSelectionGotStartedWith, setFileIdSelectionGotStartedWith] = React.useState<
		string | undefined
	>();
	const [idsOfSelectedFiles, setIdsOfSelectedFiles] = React.useState<string[]>([]);
	const [fileToRenameId, setFileToRenameId] = React.useState<string | undefined>();

	const selectedFiles = files.filter((file) => !!idsOfSelectedFiles.find((id) => id === file.id));

	const filesWithTags: FileForUI[] = React.useMemo(
		() =>
			files.map((file) => ({
				...file,
				tags: file.ctime === undefined ? [] : getTagsOfFile({ uri: file.uri, ctime: file.ctime }),
			})),
		[files, getTagsOfFile],
	);

	/*
	 * Compute files to show:
	 * - if no filter input is given, just sort the files.
	 *   Directories first and files second. Each section sorted by name.
	 * - otherwise, let "match-sorter" do its job for filtering and sorting.
	 */
	const filesToShow = React.useMemo(() => {
		let result;

		if (strings.isNullishOrEmpty(filterInput)) {
			result = arrays
				.wrap(filesWithTags)
				.stableSort((a, b) => {
					if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
						return -1;
					} else if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
						return 1;
					}
					return 0;
				})
				.stableSort((a, b) => {
					if (a.fileType === FILE_TYPE.DIRECTORY && b.fileType === FILE_TYPE.FILE) {
						return -1;
					} else if (a.fileType === FILE_TYPE.FILE && b.fileType === FILE_TYPE.DIRECTORY) {
						return 1;
					}
					return 0;
				})
				.getValue();
		} else {
			result = arrays
				.wrap(filesWithTags)
				.matchSort(filterInput, {
					// avoid "WORD STARTS WITH" ranking of match-sorter by replacing each blank with another character
					keys: [(file) => file.name.replace(' ', '_')],
					threshold: matchSorter.rankings.CONTAINS,
				})
				.getValue();
		}

		return result;
	}, [filterInput, filesWithTags]);

	const lengthOfSelectedFiles = selectedFiles.length;
	const idOfFirstSelectedFile = selectedFiles[0]?.id;
	React.useEffect(() => {
		if (lengthOfSelectedFiles === 1 && fileIdSelectionGotStartedWith !== idOfFirstSelectedFile) {
			setFileIdSelectionGotStartedWith(idOfFirstSelectedFile);
		}
	}, [
		lengthOfSelectedFiles,
		idOfFirstSelectedFile,
		fileIdSelectionGotStartedWith,
		setFileIdSelectionGotStartedWith,
	]);

	// on mount, and every time the filter input changes, reset selection (just select the first file)
	const prevFilterInput = usePrevious(filterInput);
	const isMounting = prevFilterInput === undefined;
	const filterInputChanged = filterInput !== prevFilterInput;
	React.useEffect(() => {
		if ((isMounting || filterInputChanged) && filesToShow.length > 0) {
			setIdsOfSelectedFiles([filesToShow[0].id]);
		}
	}, [isMounting, filterInputChanged, filesToShow]);

	return (
		<ExplorerContext.Provider
			value={{
				values: {
					filterInput,
					fileIdSelectionGotStartedWith,
					idsOfSelectedFiles,
					fileToRenameId,

					explorerId,
					files: filesWithTags,
					filesToShow,
					selectedFiles,
				},
				actions: {
					setFilterInput,
					setFileIdSelectionGotStartedWith,
					setIdsOfSelectedFiles,
					setFileToRenameId,
				},
			}}
		>
			{children}
		</ExplorerContext.Provider>
	);
};

function useExplorerContext() {
	const valueOfContext = React.useContext(ExplorerContext);
	if (valueOfContext === undefined) {
		throw new Error(`ExplorerContext not available`);
	}
	return valueOfContext;
}

export function useFilterInput() {
	const contextValue = useExplorerContext();
	return contextValue.values.filterInput;
}

export function useFileIdSelectionGotStartedWith() {
	const contextValue = useExplorerContext();
	return contextValue.values.fileIdSelectionGotStartedWith;
}

export function useIdsOfSelectedFiles() {
	const contextValue = useExplorerContext();
	return contextValue.values.idsOfSelectedFiles;
}

// computed/pass-through values
export function useExplorerId() {
	const contextValue = useExplorerContext();
	return contextValue.values.explorerId;
}

export function useFilesToShow() {
	const contextValue = useExplorerContext();
	return contextValue.values.filesToShow;
}

export function useSelectedFiles() {
	const contextValue = useExplorerContext();
	return contextValue.values.selectedFiles;
}

export function useFileToRename() {
	const contextValue = useExplorerContext();

	return React.useMemo(() => {
		let fileToRename: FileForUI | undefined;
		if (contextValue.values.fileToRenameId) {
			fileToRename = contextValue.values.files.find(
				(file) => file.id === contextValue.values.fileToRenameId,
			);
		}
		return fileToRename;
	}, [contextValue.values.fileToRenameId, contextValue.values.files]);
}

export function useSetFilterInput() {
	const contextValue = useExplorerContext();
	return contextValue.actions.setFilterInput;
}

export function useSetIdsOfSelectedFiles() {
	const contextValue = useExplorerContext();
	return contextValue.actions.setIdsOfSelectedFiles;
}

export function useSetFileToRenameId() {
	const contextValue = useExplorerContext();
	return contextValue.actions.setFileToRenameId;
}
