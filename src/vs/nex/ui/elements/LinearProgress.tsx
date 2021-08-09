// taken from: https://material-ui.com/components/progress/#linear-with-label
import * as React from 'react';
import {
	Box,
	LinearProgress as MuiLinearProgress,
	LinearProgressProps as MuiLinearProgressProps,
} from '@material-ui/core';

import { Stack } from 'vs/nex/ui/layouts/Stack';
import { TextBox } from 'vs/nex/ui/elements/TextBox';

type LinearProgressProps = MuiLinearProgressProps & {
	value: number;
};

export const LinearProgress: React.FC<LinearProgressProps> = ({ value, ...otherProps }) => {
	const variant = otherProps.variant ?? 'determinate';

	return (
		<Stack alignItems="center">
			<MuiLinearProgress
				value={value}
				{...otherProps}
				variant={variant}
				sx={{ width: '100%', ...otherProps.sx }}
			/>
			{variant === 'determinate' && (
				<Box sx={{ minWidth: 35 }}>
					<TextBox fontSize="sm" sx={{ color: 'textSecondary' }}>{`${Math.round(value)}%`}</TextBox>
				</Box>
			)}
		</Stack>
	);
};
