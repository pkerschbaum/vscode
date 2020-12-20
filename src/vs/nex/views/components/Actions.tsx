import * as React from 'react';
import styled from 'styled-components';

import Button from 'vs/nex/views/elements/Button';
import { dimensionMarginMedium } from 'vs/nex/views/constants/dimensions';

const Div = styled.div`
	display: flex;
	margin: ${dimensionMarginMedium};

	& > * {
		margin-left: ${dimensionMarginMedium};
	}

	& > *:first-child {
		margin-left: 0;
	}
`;

export interface ActionsProps {
	cutAction: () => void;
	copyAction: () => void;
	pasteAction: () => void;
	openAction: () => Promise<void>;
	moveToTrashAction: () => void;
}

const Actions = ({
	cutAction,
	copyAction,
	pasteAction,
	openAction,
	moveToTrashAction,
}: ActionsProps) => (
	<Div>
		<Button onClick={cutAction}>CUT</Button>
		<Button onClick={copyAction}>COPY</Button>
		<Button onClick={pasteAction}>PASTE</Button>
		<Button onClick={openAction}>OPEN</Button>
		<Button onClick={moveToTrashAction}>MOVE TO TRASH</Button>
	</Div>
);

export default Actions;
