import {
	// https://github.com/mui-org/material-ui/issues/13394
	createTheme as createMuiTheme,
	ThemeOptions as MuiThemeOptions,
	Theme as MuiTheme,
} from '@material-ui/core/styles';
import { Localization } from '@material-ui/core/locale';
import { css } from '@emotion/react';

import { PROCESS_STATUS } from 'vs/nex/platform/file-types';

declare module '@material-ui/core/styles/createTheme' {
	interface Theme {
		availableTagColors: string[];
		processStatusColors: {
			[status in PROCESS_STATUS]: string;
		};
	}
	interface ThemeOptions {
		availableTagColors: string[];
		processStatusColors: {
			[status in PROCESS_STATUS]: string;
		};
	}
}

declare module '@emotion/react/types' {
	interface Theme extends MuiTheme {}
	interface ThemeOptions extends MuiThemeOptions {}
}

export const BACKGROUND_COLOR = '#241F1A';
const PAPER_COLOR = '#2F2A26';
const PRIMARY_COLOR = '#30E5FF';
export const tabIndicatorSpanClassName = 'MuiTabs-indicatorSpan';

export const createTheme = (locale: Localization) => {
	const theme: MuiThemeOptions = {
		components: {
			MuiButton: {
				defaultProps: {
					variant: 'outlined',
					type: 'button',
				},
				styleOverrides: {
					root: css`
						text-transform: initial;
						padding-top: 4px;
						padding-bottom: 4px;
						padding-left: 12px;
						padding-right: 12px;

						transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
							box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
							border-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
							color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;

						&:hover.MuiButton-outlined {
							border-color: ${PAPER_COLOR};
							background-color: rgba(255, 255, 255, 0.08);
						}
					`,
					outlined: css`
						color: white;
						background-color: ${PAPER_COLOR};
						outline-color: initial;
						border-color: ${PAPER_COLOR};
					`,
				},
			},

			MuiInputBase: {
				styleOverrides: {
					input: css`
						padding-top: 6px;
						padding-bottom: 6px;
						padding-left: 12px;
						padding-right: 12px;
					`,
				},
			},

			MuiTextField: {
				defaultProps: { size: 'small' },
			},

			MuiTooltip: {
				defaultProps: { disableInteractive: true },
			},

			MuiTabs: {
				styleOverrides: {
					flexContainer: css`
						gap: 8px;
					`,

					indicator: css`
						right: initial;
						width: 3px;
						display: flex;
						flex-direction: column;
						justify-content: center;
						background-color: transparent;

						& .${tabIndicatorSpanClassName} {
							max-height: 16px;
							height: 100%;
							background-color: ${PRIMARY_COLOR};
							border-radius: 4px;
						}
					`,
				},
			},

			MuiTab: {
				styleOverrides: {
					root: css`
						text-transform: none;
						padding: 0;
						min-height: 0;
					`,
				},
			},
		},

		typography: {
			fontFamily: ['Segoe UI Variable', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
			fontSize: 12,
		},

		palette: {
			mode: 'dark',
			background: { default: BACKGROUND_COLOR, paper: PAPER_COLOR },
			primary: { main: PRIMARY_COLOR },
		},

		availableTagColors: [
			'#F28B82',
			'#5B7E2F',
			'#FBBC04',
			'#FFF475',
			'#3bd4c5',
			'#5ea9eb',
			'#AECBFA',
			'#D7AEFB',
			'#FDCFE8',
			'#E6C9A8',
		],

		processStatusColors: {
			[PROCESS_STATUS.PENDING_FOR_USER_INPUT]: '#A88518',
			[PROCESS_STATUS.RUNNING]: PAPER_COLOR,
			[PROCESS_STATUS.SUCCESS]: '#5B7E2F',
			[PROCESS_STATUS.FAILURE]: '#B35C54',
			[PROCESS_STATUS.ABORT_REQUESTED]: PAPER_COLOR,
			[PROCESS_STATUS.ABORT_SUCCESS]: '#5B7E2F',
		},
	};

	return createMuiTheme(theme, locale);
};
