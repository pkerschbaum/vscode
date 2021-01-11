import { css, Theme } from '@emotion/react';

export const styles = {
	container: (theme: Theme) =>
		css`
			padding-top: ${theme.spacing()};
			padding-bottom: ${theme.spacing()};

			& > * {
				padding-left: ${theme.spacing()};
				padding-right: ${theme.spacing()};
			}

			& > *:last-of-type {
				padding-left: 0;
				padding-right: 0;
			}

			/*
			 * disable outline if things are focused. repeat ampersand to increase specificity (VS code style
			 * which needs to get overriden comes e.g. from selector ".monaco-workbench input[type="text"]:focus")
			 */
			&&& input:focus,
			&&& button:focus,
			&&& [tabindex='-1']:focus {
				outline: 0;
			}
		`,

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

	tagAutocomplete: css`
		min-width: 150px;
	`,

	colorButton: css`
		min-height: 0;
		min-width: 0;
		padding: 0;
		height: 24px;
		width: 24px;
	`,

	tagNameInput: css`
		width: 170px;
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
