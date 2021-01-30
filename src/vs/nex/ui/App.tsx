import * as React from 'react';

import { URI } from 'vs/base/common/uri';

import { styles } from 'vs/nex/ui/App.styles';
import { commonStyles } from 'vs/nex/ui/Common.styles';
import { Stack } from 'vs/nex/ui/layouts/Stack';
import { Explorer } from 'vs/nex/ui/Explorer';
import {
	useFileProviderCwd,
	useFileProviderExplorers,
} from 'vs/nex/platform/store/file-provider/file-provider.hooks';

export const App: React.FC = () => {
	const explorers = useFileProviderExplorers();

	return (
		<Stack
			className="show-file-icons"
			css={[styles.container, commonStyles.fullHeight]}
			direction="column"
			alignItems="stretch"
			stretchContainer
		>
			{Object.keys(explorers).map((explorerId) => (
				<ExplorerContainer key={explorerId} explorerId={explorerId} />
			))}
		</Stack>
	);
};

const ExplorerContainer: React.FC<{ explorerId: string }> = ({ explorerId }) => {
	const cwd = useFileProviderCwd(explorerId);

	return <Explorer key={URI.from(cwd).toString()} explorerId={explorerId} />;
};
