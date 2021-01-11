import {
	// https://github.com/mui-org/material-ui/issues/13394
	unstable_createMuiStrictModeTheme as createMuiTheme,
	ThemeOptions,
	Theme as MuiTheme,
} from '@material-ui/core/styles';
import { Localization } from '@material-ui/core/locale';

declare module '@emotion/react/types' {
	interface Theme extends MuiTheme {}
}

export const createTheme = (locale: Localization) => {
	const primaryColor = '#202932';

	const theme: ThemeOptions = {
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
	};

	return createMuiTheme(theme, locale);
};
