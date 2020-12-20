import styled from 'styled-components';

import { colorNeutral, colorNeutralFocus } from 'vs/nex/views/constants/colors';

const Button = styled.button`
	background: ${colorNeutral};

	:hover,
	:focus-within {
		background: ${colorNeutralFocus};
	}
`;

export default Button;
