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
};
