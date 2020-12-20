import * as React from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';

import { AppState } from 'vs/nex/platform/store/reducers';

import {
	dimensionPaddingVerticalMedium,
	dimensionMarginMedium,
} from 'vs/nex/views/constants/dimensions';
import { colorGrey } from 'vs/nex/views/constants/colors';
import { commonShadow } from 'vs/nex/views/constants/style-elements';

const Container = styled.div`
	display: flex;
	padding: ${dimensionPaddingVerticalMedium};

	border-bottom: 1px solid;
	border-top: 1px solid;
	border-color: ${colorGrey};

	box-shadow: ${commonShadow};

	& > * {
		margin-left: ${dimensionMarginMedium};
	}

	& > *:first-child {
		margin-left: 0;
	}
`;

const ProcessElem = styled.div`
	display: flex;
	flex-direction: column;
`;

const ProgressBar = () => {
	const pasteProcesses = useSelector((state: AppState) => state.fileProvider.pasteProcesses);

	return (
		<Container>
			{pasteProcesses &&
				pasteProcesses.length > 0 &&
				pasteProcesses.map((pasteProcess) => (
					<ProcessElem key={pasteProcess.id}>
						<div>{pasteProcess.status}</div>
						<div>{pasteProcess.bytesProcessed}</div>
						<div>{pasteProcess.totalSize}</div>
					</ProcessElem>
				))}
		</Container>
	);
};

export default ProgressBar;
