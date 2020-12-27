import { css } from '@emotion/react';

export const styles = {
	container: css({
		// disable outline if things are focused. repeat ampersand to increase specificity (VS code style
		// which needs to get overriden comes e.g. from selector ".monaco-workbench input[type="text"]:focus")
		'&&& input:focus, &&& button:focus, &&& [tabindex="-1"]:focus': {
			outline: 0,
		},
	}),

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
};
