import { css } from '@emotion/react';

export const styles = {
	dirContentIcon: css`
		::before {
			/* icon-theme.ts sets a unwanted font-size, use !important to overrule that*/
			font-size: 2em !important;

			display: flex;
			align-items: center;
			justify-content: center;
			width: 24px;
			max-width: 24px;
			height: 1em;
			max-height: 1em;
			margin-right: 4px;

			background-size: 24px 1em;
			background-repeat: no-repeat;
			-webkit-font-smoothing: antialiased;
		}
	`,
};
