import { useEffect } from 'react';

type KeyFunctionMap = {
	[key: string]:
		| (() => void)
		| {
				additionalKeys?: Array<'ALT' | 'CTRL'> | ReadonlyArray<'ALT' | 'CTRL'>;
				handler: () => void;
		  };
};

export function useKeydownHandler(keyFunctionMap: KeyFunctionMap) {
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
			}
		};

		window.addEventListener('keydown', keyUpHandler, { passive: true });
		return () => window.removeEventListener('keydown', keyUpHandler);
	});
}
