import {
	// https://github.com/mui-org/material-ui/issues/13394
	unstable_createMuiStrictModeTheme as createMuiTheme,
	ThemeOptions as MuiThemeOptions,
	Theme as MuiTheme,
} from '@material-ui/core/styles';
import { Localization } from '@material-ui/core/locale';

declare module '@material-ui/core/styles/createMuiTheme' {
	interface Theme {
		availableTagColors: string[];
	}
	interface ThemeOptions {
		availableTagColors: string[];
	}
}

declare module '@emotion/react/types' {
	interface Theme extends MuiTheme {}
	interface ThemeOptions extends MuiThemeOptions {}
}

export const createTheme = (locale: Localization) => {
	const primaryColor = '#202932';

	const theme: MuiThemeOptions = {
		components: {
			MuiDivider: {
				styleOverrides: {
					root: { backgroundColor: 'rgba(0, 0, 0, 0.25)' },
				},
			},

			MuiButton: {
				defaultProps: { variant: 'outlined', type: 'button' },
			},

			MuiTextField: { defaultProps: { size: 'small' } },

			MuiIconButton: {
				styleOverrides: {
					root: {
						color: primaryColor,
						padding: 4,
					},
				},
			},
		},

		palette: { primary: { main: primaryColor }, secondary: { main: '#581c0c' } },

		availableTagColors: [
			'#F28B82',
			'#B2E775',
			'#FBBC04',
			'#FFF475',
			'#3bd4c5',
			'#5ea9eb',
			'#AECBFA',
			'#D7AEFB',
			'#FDCFE8',
			'#E6C9A8',
		],
	};

	return createMuiTheme(theme, locale);
};
