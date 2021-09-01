import * as React from 'react';

type ExplorerContextValue = {
	values: {
		filterInput: string;
		fileIdSelectionGotStartedWith: string | undefined;
	};
	actions: {
		setFilterInput: (newFilterInput: string) => void;
		setFileIdSelectionGotStartedWith: (newFileIdSelectionGotStartedWith: string) => void;
	};
};

const ExplorerContext = React.createContext<ExplorerContextValue | undefined>(undefined);

export const ExplorerContextProvider: React.FC<{
	children: React.ReactElement;
}> = ({ children }) => {
	const [filterInput, setFilterInput] = React.useState('');
	const [fileIdSelectionGotStartedWith, setFileIdSelectionGotStartedWith] = React.useState<
		string | undefined
	>();

	return (
		<ExplorerContext.Provider
			value={{
				values: {
					filterInput,
					fileIdSelectionGotStartedWith,
				},
				actions: {
					setFilterInput,
					setFileIdSelectionGotStartedWith,
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

export function useSetFilterInput() {
	const contextValue = useExplorerContext();
	return contextValue.actions.setFilterInput;
}

export function useSetFileIdSelectionGotStartedWith() {
	const contextValue = useExplorerContext();
	return contextValue.actions.setFileIdSelectionGotStartedWith;
}
