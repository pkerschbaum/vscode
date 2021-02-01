import { css, Theme } from '@emotion/react';

export const styles = {
	container: (theme: Theme) =>
		css`
			padding-top: ${theme.spacing()};
			padding-bottom: ${theme.spacing()};

			/*
			 * disable outline if things are focused. repeat ampersand to increase specificity (VS code style
			 * which needs to get overriden comes e.g. from selector ".monaco-workbench input[type="text"]:focus")
			 */
			&&& input:focus,
			&&& button:focus,
			&&& [tabindex='0']:focus,
			&&& [tabindex='-1']:focus {
				outline: 0;
			}
		`,

	tabPanel: (theme: Theme) => css`
		border-right: 1px solid ${theme.palette.divider};
	`,

	tab: css`
		text-transform: none;
	`,
};
