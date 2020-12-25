import * as React from 'react';
import { useDispatch } from 'react-redux';

export const useActionsWithDispatch = <T extends {}>(actions: T) => {
	// use type "Dispatch" just to clarify that dispatching is automatically done
	type Dispatch<FuncType> = FuncType;

	type DispatchType = {
		[P in keyof typeof actions]: Dispatch<typeof actions[P]>;
	};

	const dispatch = useDispatch<any>();

	const actionsWithDispatch: any = {};

	for (const action in actions) {
		if (actions.hasOwnProperty(action)) {
			actionsWithDispatch[action] = (...args: any[]) => dispatch((actions as any)[action](...args));
		}
	}

	return actionsWithDispatch as DispatchType;
};

// https://usehooks.com/useDebounce/
export function useDebounce<T>(value: T, delay: number): T {
	// State and setters for debounced value
	const [debouncedValue, setDebouncedValue] = React.useState(value);

	React.useEffect(
		() => {
			// Update debounced value after delay
			const handler = setTimeout(() => {
				setDebouncedValue(value);
			}, delay);

			// Cancel the timeout if value changes (also on delay change or unmount)
			// This is how we prevent debounced value from updating if value is changed ...
			// .. within the delay period. Timeout gets cleared and restarted.
			return () => {
				clearTimeout(handler);
			};
		},
		[value, delay], // Only re-call effect if value or delay changes
	);

	return debouncedValue;
}
