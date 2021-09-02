import * as React from 'react';
import { Box, BoxProps } from '@mui/material';

import { styles } from 'vs/nex/ui/elements/TextBox.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { assertUnreachable } from 'vs/nex/base/utils/types.util';

// adapted from https://github.com/mui-org/material-ui/blob/next/packages/material-ui/src/Typography/Typography.js
export const TextBox = React.forwardRef<
	HTMLElement,
	{
		fontBold?: boolean;
		fontItalic?: boolean;
		fontSize?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';
		disablePreserveNewlines?: boolean;
		sx?: BoxProps['sx'];
		className?: string;
		children?: React.ReactNode;
	}
>(function TextBox(props, ref) {
	const {
		fontBold = false,
		fontItalic = false,
		fontSize = 'md',
		disablePreserveNewlines,

		sx,
		className,
		children,
	} = props;

	let fontSizeStyle;
	switch (fontSize) {
		case 'sm': {
			fontSizeStyle = styles.textBox_sm;
			break;
		}
		case 'lg': {
			fontSizeStyle = styles.textBox_lg;
			break;
		}
		case 'xl': {
			fontSizeStyle = styles.textBox_xl;
			break;
		}
		case 'xxl': {
			fontSizeStyle = styles.textBox_xxl;
			break;
		}
		case 'xxxl': {
			fontSizeStyle = styles.textBox_xxxl;
			break;
		}
		case 'md': {
			break;
		}
		default: {
			assertUnreachable(fontSize);
		}
	}

	return (
		<Box
			className={className}
			css={[
				styles.textBox,
				fontSizeStyle,
				fontBold && styles.textBox_bold,
				!disablePreserveNewlines && commonStyles.preserveNewlines,
			]}
			fontStyle={fontItalic ? 'italic' : undefined}
			sx={sx}
			component="span"
			/* add ref, see https://github.com/mui-org/material-ui/issues/17010#issuecomment-615577360 */
			{...({ ref } as any)}
		>
			{children}
		</Box>
	);
});
