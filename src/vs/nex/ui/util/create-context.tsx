import * as React from 'react';

export function createContext<T>(name: string) {
	const Context = React.createContext<T | undefined>(undefined);

	const useContextValue = () => {
		const valueOfContext = React.useContext(Context);
		if (valueOfContext === undefined) {
			throw new Error(`${name} context not available`);
		}
		return valueOfContext;
	};

	const Provider: React.FC<{
		children: React.ReactElement;
		value: T;
	}> = ({ children, value }) => {
		return <Context.Provider value={value}>{children}</Context.Provider>;
	};

	return { useContextValue, Provider };
}
