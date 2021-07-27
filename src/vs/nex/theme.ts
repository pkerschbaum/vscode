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

export const createTheme = (locale: Localization) => {
	const theme: MuiThemeOptions = {
		components: {
			MuiButton: {
				defaultProps: { variant: 'outlined', type: 'button' },
			},

			MuiTextField: { defaultProps: { size: 'small' } },

			MuiTableCell: {
				styleOverrides: {
					root: css`
						font-size: 1rem;
					`,
				},
			},
		},

		typography: {
			fontFamily: ['Segoe UI Variable', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
		},

		palette: {
			mode: 'dark',
			background: { default: BACKGROUND_COLOR, paper: PAPER_COLOR },
			primary: { main: '#30E5FF' },
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
		},
	};

	return createMuiTheme(theme, locale);
};
