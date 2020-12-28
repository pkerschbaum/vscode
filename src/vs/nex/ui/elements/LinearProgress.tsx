// taken from: https://material-ui.com/components/progress/#linear-with-label
import {
	Box,
	LinearProgress as MuiLinearProgress,
	LinearProgressProps as MuiLinearProgressProps,
	Typography,
} from '@material-ui/core';
import * as React from 'react';

type LinearProgressProps = Omit<MuiLinearProgressProps, 'variant'> & {
	value: number;
	showLabel?: boolean;
};

export const LinearProgress: React.FC<LinearProgressProps> = ({
	showLabel,
	value,
	...otherProps
}) => {
	return (
		<Box sx={{ display: 'flex', alignItems: 'center' }}>
			<Box sx={{ width: '100%', mr: 1 }}>
				<MuiLinearProgress variant="determinate" value={value} {...otherProps} />
			</Box>
			{showLabel && (
				<Box sx={{ minWidth: 35 }}>
					<Typography variant="body2" color="textSecondary">{`${Math.round(value)}%`}</Typography>
				</Box>
			)}
		</Box>
	);
};
