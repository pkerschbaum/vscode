import * as React from 'react';
const { useState, useEffect, useCallback } = React;
import styled from 'styled-components';

import { logger } from 'vs/nex/base/logger/logger';

import { FolderInput, PATHPART_INPUT_WORKAROUND_OFFSET } from 'vs/nex/views/components/FolderInput';
import Button from 'vs/nex/views/elements/Button';
import {
	dimensionMarginMedium,
	dimensionPaddingVerticalSmall,
	dimensionPaddingHorizontalMedium,
	dimensionBorderRadius,
} from 'vs/nex/views/constants/dimensions';
import { colorNeutral, colorNeutralFocus, colorUnimportant } from 'vs/nex/views/constants/colors';
import { commonShadowTransform } from 'vs/nex/views/constants/style-elements';

const PATH_SEPARATOR = '/';

const Navigation = styled.div`
	display: flex;
	justify-content: flex-start;
	align-items: center;

	width: fit-content;
	margin: ${dimensionMarginMedium};

	& > * {
		margin: 0 0 0 ${dimensionMarginMedium};
	}

	& > *:first-child {
		margin: 0;
	}
`;

const PathPartReadOnly = styled.span`
	color: ${colorUnimportant};
	user-select: none;

	transition: ${commonShadowTransform};

	&:hover {
		cursor: pointer;
		background: ${colorNeutral};
	}
`;

const PathPartSeparator = styled.span`
	color: ${colorUnimportant};
	margin: 0 0.5em;
	user-select: none;
`;

const PathNavigation = styled.div`
	display: flex;
	justify-content: flex-start;
	align-items: center;

	width: fit-content;
	padding: 0.15em
		calc(${dimensionPaddingHorizontalMedium} - ${PATHPART_INPUT_WORKAROUND_OFFSET + 'px'})
		${dimensionPaddingVerticalSmall} ${dimensionPaddingHorizontalMedium};

	background: ${colorNeutral};
	border-radius: ${dimensionBorderRadius};
	border: 0;

	transition: ${commonShadowTransform};

	:hover,
	:focus-within {
		background: ${colorNeutralFocus};
	}

	&:hover
		> ${PathPartReadOnly},
		&:focus-within
		> ${PathPartReadOnly},
		&:hover
		> ${PathPartSeparator},
		&:focus-within
		> ${PathPartSeparator} {
		color: inherit;
	}
`;

export interface FolderNavigationProps {
	cwd: string;
	checkDirectory: (path: string) => Promise<boolean>;
	changeDirectory: (dir: string) => void;
}

const createPath = (pathParts: string[]) => pathParts.join(PATH_SEPARATOR);

const FolderNavigation = ({ cwd, checkDirectory, changeDirectory }: FolderNavigationProps) => {
	const [pathParts, updatePathParts] = useState([] as string[]);
	const [isValidDirectory, updateIsValidDir] = useState(true);
	const [inputFocusRequired, updateInputFocusRequired] = useState(false);

	const applyCwd = useCallback(
		(trimLastPart: boolean) => {
			let pathPartsProp = cwd.split(PATH_SEPARATOR);
			if (trimLastPart && pathPartsProp[pathPartsProp.length - 1] === '') {
				pathPartsProp = pathPartsProp.slice(0, -1);
			}
			updatePathParts(pathPartsProp);
			updateIsValidDir(true);
		},
		[cwd],
	);

	useEffect(() => {
		// if new cwd is provided via prop, i.e. from application state --> use the new cwd for the component
		// apply new cwd
		applyCwd(false);
	}, [applyCwd, cwd]);

	async function checkAndChangeDirectory(newPathParts: string[]) {
		const directoryPath = createPath(newPathParts);
		const valid = await checkDirectory(directoryPath);
		updateIsValidDir(valid);
		if (valid) {
			changeDirectory(directoryPath);
		}
		updatePathParts(newPathParts);
	}

	async function navigateUp() {
		if (pathParts.length > 1) {
			const newPathParts = pathParts.slice(0, -1);
			return checkAndChangeDirectory(newPathParts);
		}
	}

	const navigateToPart = (pathPart: string) => async () => {
		const index = pathParts.indexOf(pathPart);
		if (index === -1) {
			logger.error(
				`could not find pathPart in pathParts array! pathPart: ${pathPart}, pathParts array: ${pathParts.join(
					',',
				)}`,
			);
			return;
		}
		const newPathParts = pathParts.slice(0, index + 1);
		return checkAndChangeDirectory(newPathParts);
	};

	const onSlashPress = () => {
		if (isValidDirectory && pathParts[pathParts.length - 1] !== '') {
			updatePathParts(pathParts.concat(['']));
		}
	};

	const onBackspacePress = () => {
		if (pathParts[pathParts.length - 1] === '' && pathParts.length > 1) {
			updatePathParts(pathParts.slice(0, -1));
			return true;
		}
		return false;
	};

	const changePathPart = async (input: string) => {
		const newPathParts = [...pathParts];
		newPathParts[newPathParts.length - 1] = input;
		return checkAndChangeDirectory(newPathParts);
	};

	const onFocusLost = () => {
		applyCwd(true);
	};

	return (
		<Navigation>
			<Button onClick={navigateUp}>UP</Button>
			<PathNavigation>
				{pathParts.map((pathPart, index) => {
					const lastElement = index === pathParts.length - 1;

					return (
						<React.Fragment key={index}>
							{!lastElement ? (
								<PathPartReadOnly onClick={navigateToPart(pathPart)}>{pathPart}</PathPartReadOnly>
							) : (
								<FolderInput
									pathPart={pathPart}
									changePathPart={changePathPart}
									onSlashPress={onSlashPress}
									onBackspacePress={onBackspacePress}
									isValidDirectory={isValidDirectory}
									onFocusLost={onFocusLost}
									inputFocusRequired={inputFocusRequired}
									updateInputFocusRequired={updateInputFocusRequired}
								/>
							)}
							{!lastElement && <PathPartSeparator>/</PathPartSeparator>}
						</React.Fragment>
					);
				})}
			</PathNavigation>
		</Navigation>
	);
};

export default FolderNavigation;
