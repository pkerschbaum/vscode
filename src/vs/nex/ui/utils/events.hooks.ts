import { useEffect, useRef } from 'react';

type EventHandlers<E extends keyof WindowEventMap> = Array<{
	condition: (e: WindowEventMap[E]) => boolean;
	handler: (e: WindowEventMap[E]) => void;
}>;

export function useWindowEvent<E extends keyof WindowEventMap>(
	event: E,
	eventHandlers: EventHandlers<E>,
) {
	useEffect(() => {
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
	const ref = useRef<T>();
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}
