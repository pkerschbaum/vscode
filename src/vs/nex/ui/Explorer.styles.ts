import { css, Theme } from '@emotion/react';

export const styles = {
	fileIcon: css`
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

	processesArea: (theme: Theme) => css`
		& > *:first-of-type {
			margin-left: ${theme.spacing()};
		}
		& > *:last-of-type {
			margin-right: ${theme.spacing()};
		}
	`,
};
