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

			MuiTooltip: {
				defaultProps: {
					disableInteractive: true,
				},

				styleOverrides: {
					tooltip: {
						backgroundColor: 'black',
						boxShadow: `0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)`, // theme.shadows[1]
					},

					arrow: {
						color: 'black',
					},
				},
			},

			MuiButton: {
				defaultProps: { variant: 'outlined' },
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
