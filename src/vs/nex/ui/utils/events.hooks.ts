import { useEffect, useRef } from 'react';

export const DEFAULT_KEYDOWN_HANDLER = Symbol('DEFAULT_HANDLER');

type KeyFunctionMap = {
	[key: string]:
		| (() => void)
		| {
				additionalKeys?: Array<'ALT' | 'CTRL'> | ReadonlyArray<'ALT' | 'CTRL'>;
				handler: () => void;
		  };
} & {
	[DEFAULT_KEYDOWN_HANDLER]?: (e: KeyboardEvent) => void;
};

export function useKeydownHandler(keyFunctionMap: KeyFunctionMap) {
	const defaultHandler = keyFunctionMap[DEFAULT_KEYDOWN_HANDLER];

	useEffect(() => {
		const keyUpHandler = (e: KeyboardEvent) => {
			const key = e.key;
			let handlerToFire;

			if (keyFunctionMap.hasOwnProperty(key)) {
				const keyHandler = keyFunctionMap[key];
				if (typeof keyHandler === 'function') {
					handlerToFire = keyHandler;
				} else {
					const allAdditionalKeysPressed =
						keyHandler.additionalKeys === undefined ||
						keyHandler.additionalKeys.every((addKey) => {
							return (addKey !== 'ALT' || e.altKey) && (addKey !== 'CTRL' || e.ctrlKey);
						});
					if (allAdditionalKeysPressed) {
						handlerToFire = keyHandler.handler;
					}
				}
			}

			if (handlerToFire) {
				handlerToFire();
			} else if (defaultHandler) {
				defaultHandler(e);
			}
		};

		window.addEventListener('keydown', keyUpHandler, { passive: true });
		return () => window.removeEventListener('keydown', keyUpHandler);
	});
}

// https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state
export function usePrevious<T>(value: T) {
	const ref = useRef<T>();
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}
