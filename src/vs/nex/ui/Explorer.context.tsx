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
import { createObservableValueContext, usePrevious } from 'vs/nex/ui/utils/react.util';

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

const [ObservableValueProvider, useSubscribeOnValue] =
	createObservableValueContext<ExplorerContextValue>();

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

	const selectedFiles = React.useMemo(
		() => files.filter((file) => !!idsOfSelectedFiles.find((id) => id === file.id)),
		[files, idsOfSelectedFiles],
	);

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
	}, [lengthOfSelectedFiles, idOfFirstSelectedFile, fileIdSelectionGotStartedWith]);

	// if no file is selected, and every time the filter input changes, reset selection (just select the first file)
	const prevFilterInput = usePrevious(filterInput);
	const filterInputChanged = filterInput !== prevFilterInput;
	React.useEffect(() => {
		if ((idsOfSelectedFiles.length === 0 || filterInputChanged) && filesToShow.length > 0) {
			setIdsOfSelectedFiles([filesToShow[0].id]);
		}
	}, [idsOfSelectedFiles, filterInputChanged, filesToShow]);

	const contextValue = React.useMemo(
		() => ({
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
		}),
		[
			filterInput,
			fileIdSelectionGotStartedWith,
			idsOfSelectedFiles,
			fileToRenameId,

			explorerId,
			filesWithTags,
			filesToShow,
			selectedFiles,

			setFilterInput,
			setFileIdSelectionGotStartedWith,
			setIdsOfSelectedFiles,
			setFileToRenameId,
		],
	);

	return <ObservableValueProvider currentValue={contextValue}>{children}</ObservableValueProvider>;
};

export function useFilterInput() {
	return useSubscribeOnValue((contextValue) => contextValue.values.filterInput);
}

export function useFileIdSelectionGotStartedWith() {
	return useSubscribeOnValue((contextValue) => contextValue.values.fileIdSelectionGotStartedWith);
}

export function useIdsOfSelectedFiles() {
	return useSubscribeOnValue((contextValue) => contextValue.values.idsOfSelectedFiles);
}

// computed/pass-through values
export function useExplorerId() {
	return useSubscribeOnValue((contextValue) => contextValue.values.explorerId);
}

export function useFilesToShow() {
	return useSubscribeOnValue((contextValue) => contextValue.values.filesToShow);
}

export function useSelectedFiles() {
	return useSubscribeOnValue((contextValue) => contextValue.values.selectedFiles);
}

export function useFileToRenameId() {
	return useSubscribeOnValue((contextValue) => contextValue.values.fileToRenameId);
}

export function useFileToRename() {
	return useSubscribeOnValue((contextValue) => {
		let fileToRename: FileForUI | undefined;
		if (contextValue.values.fileToRenameId) {
			fileToRename = contextValue.values.filesToShow.find(
				(file) => file.id === contextValue.values.fileToRenameId,
			);
		}
		return fileToRename;
	});
}

export function useSetFilterInput() {
	return useSubscribeOnValue((contextValue) => contextValue.actions.setFilterInput);
}

export function useSetIdsOfSelectedFiles() {
	return useSubscribeOnValue((contextValue) => contextValue.actions.setIdsOfSelectedFiles);
}

export function useSetFileToRenameId() {
	return useSubscribeOnValue((contextValue) => contextValue.actions.setFileToRenameId);
}
