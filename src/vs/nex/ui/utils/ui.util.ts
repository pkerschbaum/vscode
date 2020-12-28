import { css } from '@emotion/react';

export const horizontalScrollProps = {
	onWheel: function (e: React.WheelEvent<HTMLElement>) {
		(e.target as any).scrollLeft += e.deltaY;
	},
	css: css`
		overflow-x: auto;

		& > * {
			pointer-events: none;
		}
	`,
};
