import * as React from 'react';
import { Button, Popover, TextField } from '@material-ui/core';

import { Stack } from 'vs/nex/ui/layouts/Stack';
import { strings } from 'vs/nex/base/utils/strings.util';

type CreateFolderProps = {
	onSubmit: (folderName: string) => void | Promise<void>;
};

export const CreateFolder: React.FC<CreateFolderProps> = ({ onSubmit }) => {
	const [createFolderValue, setCreateFolderValue] = React.useState('');
	const [createFolderAnchorEl, setCreateFolderAnchorEl] = React.useState<HTMLButtonElement | null>(
		null,
	);

	React.useEffect(
		function clearFolderValueOnPopoverClose() {
			if (createFolderAnchorEl === null) {
				setCreateFolderValue('');
			}
		},
		[createFolderAnchorEl],
	);

	async function handleSubmit() {
		if (strings.isNullishOrEmpty(createFolderValue)) {
			return;
		}

		await onSubmit(createFolderValue);
		setCreateFolderAnchorEl(null);
	}

	return (
		<>
			<Button onClick={(e) => setCreateFolderAnchorEl(e.currentTarget)}>New Folder</Button>

			<Popover
				open={createFolderAnchorEl !== null}
				anchorEl={createFolderAnchorEl}
				onClose={() => setCreateFolderAnchorEl(null)}
				anchorOrigin={{
					vertical: 'bottom',
					horizontal: 'center',
				}}
				transformOrigin={{
					vertical: 'top',
					horizontal: 'center',
				}}
				BackdropProps={{ invisible: false }}
			>
				<form onSubmit={handleSubmit}>
					<Stack direction="column" alignItems="stretch" sx={{ padding: 1.5 }}>
						<TextField
							autoFocus
							label="Name of folder"
							value={createFolderValue}
							onChange={(event) => setCreateFolderValue(event.target.value)}
						/>
						<Stack direction="row-reverse">
							<Button
								variant={strings.isNullishOrEmpty(createFolderValue) ? undefined : 'contained'}
								type="submit"
								disabled={strings.isNullishOrEmpty(createFolderValue)}
							>
								Create
							</Button>
						</Stack>
					</Stack>
				</form>
			</Popover>
		</>
	);
};
