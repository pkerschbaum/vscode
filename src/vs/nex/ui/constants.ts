export const KEYS = {
	C: 'c',
	X: 'x',
	V: 'v',
	ARROW_UP: 'ArrowUp',
	ARROW_DOWN: 'ArrowDown',
	PAGE_UP: 'PageUp',
	PAGE_DOWN: 'PageDown',
	DELETE: 'Delete',
	ENTER: 'Enter',
	BACKSPACE: 'Backspace',
} as const;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type KEYS = typeof KEYS;
