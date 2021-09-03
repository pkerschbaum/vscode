import * as React from 'react';
import { useDispatch } from 'react-redux';

import { Emitter, Event } from 'vs/base/common/event';

type EventHandlers<E extends keyof WindowEventMap> = Array<{
	condition: (e: WindowEventMap[E]) => boolean;
	handler: (e: WindowEventMap[E]) => void;
}>;

export function useWindowEvent<E extends keyof WindowEventMap>(
	event: E,
	eventHandlers: EventHandlers<E> | null,
) {
	React.useEffect(() => {
		if (eventHandlers === null) {
			return;
		}

		const keyUpHandler = (e: WindowEventMap[E]) => {
			const handlerToFire = eventHandlers.find((handler) => handler.condition(e))?.handler;
			if (handlerToFire) {
				handlerToFire(e);
			}
		};

		window.addEventListener(event, keyUpHandler);
		return () => window.removeEventListener(event, keyUpHandler);
	}, [event, eventHandlers]);
}

// https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state
export function usePrevious<T>(value: T) {
	const ref = React.useRef<T>();
	React.useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}

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

export function useRerenderOnEventFire<T>(event: Event<T>, shouldRerender: (value: T) => boolean) {
	const [, setCurrentVal] = React.useState(0);

	React.useEffect(
		function triggerRrenderIfNecessary() {
			const disposable = event((value) => {
				if (shouldRerender(value)) {
					setCurrentVal((oldVal) => oldVal + 1);
				}
			});
			return () => disposable.dispose();
		},
		[event, shouldRerender],
	);
}

export function createObservableValueContext<ContextValue>() {
	const ValueChangedEventContext = React.createContext<Event<void> | undefined>(undefined);
	const ValueRefContext = React.createContext<React.MutableRefObject<ContextValue> | undefined>(
		undefined,
	);

	type ObservableValueProviderProps = {
		currentValue: ContextValue;
		children: React.ReactElement;
	};

	const ObservableValueProvider: React.FC<ObservableValueProviderProps> = ({
		currentValue,
		children,
	}) => {
		const [valueChangedEmitter] = React.useState(() => new Emitter<void>());
		const valueRef = React.useRef(currentValue);
		valueRef.current = currentValue;

		React.useLayoutEffect(
			function notifyEventListenersOfChangedValue() {
				valueChangedEmitter.fire();
			},
			[currentValue],
		);

		return (
			<ValueChangedEventContext.Provider value={valueChangedEmitter.event}>
				<ValueRefContext.Provider value={valueRef}>{children}</ValueRefContext.Provider>
			</ValueChangedEventContext.Provider>
		);
	};

	function useSubscribeOnValue<Result>(selector: (contextValue: ContextValue) => Result) {
		const valueChangedEvent = React.useContext(ValueChangedEventContext);
		const valueRef = React.useContext(ValueRefContext);

		if (valueChangedEvent === undefined || valueRef === undefined) {
			throw new Error(`hook was not called inside the corresponding ObservableValueProvider`);
		}

		const [, forceRender] = React.useReducer((s) => s + 1, 0);
		const currentSelectorRef = React.useRef(selector);
		currentSelectorRef.current = selector;
		const memoizedSelectorResult = React.useRef(currentSelectorRef.current(valueRef.current));

		React.useEffect(() => {
			const disposable = valueChangedEvent(() => {
				const newValue = currentSelectorRef.current(valueRef.current);
				if (!Object.is(memoizedSelectorResult.current, newValue)) {
					memoizedSelectorResult.current = newValue;
					forceRender();
				}
			});
			return () => disposable.dispose();
		}, [valueChangedEvent, valueRef]);

		return memoizedSelectorResult.current;
	}

	return [ObservableValueProvider, useSubscribeOnValue] as const;
}
