import * as React from 'react';
const { useEffect, useLayoutEffect, useRef, useState } = React;
import styled from 'styled-components';

import { colorIndicateValid, colorIndicateInvalid } from 'vs/nex/views/constants/colors';
import { commonValidityTransform } from 'vs/nex/views/constants/style-elements';

export const PATHPART_INPUT_WORKAROUND_OFFSET = 10;
export const PATHPART_INPUT_MIN_WIDTH = 2.5;
const KEYCODE_BACKSPACE = 8;

interface FolderInputProps {
	pathPart: string;
	changePathPart: (input: string) => void;

	onSlashPress: () => void;
	onBackspacePress: () => boolean;
	isValidDirectory: boolean;

	onFocusLost: () => void;
	inputFocusRequired: boolean;
	updateInputFocusRequired: (focusRequired: boolean) => void;
}

const ValidityIndicator = styled.span`
	position: absolute;
	display: inline-block;
	width: calc(100% - ${PATHPART_INPUT_WORKAROUND_OFFSET + 'px'});
	min-width: ${PATHPART_INPUT_MIN_WIDTH + 'em'};
	height: 0.15em;
	left: -100%;
	bottom: 0;

	transition: ${commonValidityTransform};

	&.valid {
		background-color: ${colorIndicateValid};
	}

	&.invalid {
		background-color: ${colorIndicateInvalid};
	}
`;

const Div = styled.div`
	position: relative;
	overflow: hidden;

	> input[type='text']:focus + ${ValidityIndicator} {
		left: 0;
	}
`;

const HiddenPlaceholder = styled.span`
	position: absolute;
	height: 0;
	overflow: hidden;
	white-space: pre;
`;

const Input = styled.input`
	min-width: calc(${PATHPART_INPUT_MIN_WIDTH + 'em'} + ${PATHPART_INPUT_WORKAROUND_OFFSET + 'px'});

	font: inherit;
	background-color: rgba(0, 0, 0, 0);
	border: none;
	/* use !important because some vscode rules override the styling of this component... */
	outline-width: 0 !important;
	width: 0;
	line-height: normal;
	padding: 4px 0;
`;

export const FolderInput = ({
	pathPart,
	changePathPart,
	onSlashPress,
	onBackspacePress,
	isValidDirectory,
	updateInputFocusRequired,
	inputFocusRequired,
	onFocusLost,
}: FolderInputProps) => {
	const [{ caretStart, caretEnd }, updateCaret] = useState({
		caretStart: null as number | null,
		caretEnd: null as number | null,
	});
	const placeholderEl = useRef<HTMLElement>(null);
	const textInputEl = useRef<HTMLInputElement>(null);

	useLayoutEffect(function retainCursorPositionAndSetFocus() {
		if (textInputEl.current) {
			if (caretStart !== null && caretEnd !== null) {
				textInputEl.current.setSelectionRange(caretStart, caretEnd);
			}
			if (inputFocusRequired) {
				textInputEl.current.focus();
				updateInputFocusRequired(false);
			}
		}
	});

	useEffect(() => {
		const textInput = textInputEl.current;
		return function willUnmount() {
			updateInputFocusRequired(textInput === document.activeElement);
		};
	}, [updateInputFocusRequired]);

	useLayoutEffect(
		function resizeTextInput() {
			// by DreamTeK, see https://stackoverflow.com/a/38867270/1700319
			const placeholder = placeholderEl.current;
			const textInput = textInputEl.current;

			if (placeholder && textInput) {
				placeholder.textContent = textInput.value;
				textInput.style.width = `${placeholder.offsetWidth + PATHPART_INPUT_WORKAROUND_OFFSET}px`;
			}
		},
		[pathPart],
	);

	const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		updateCaret({ caretStart: e.target.selectionStart, caretEnd: e.target.selectionEnd });
		changePathPart(e.target.value);
	};

	const onKeyDown = (e: React.KeyboardEvent) => {
		const pressedEnter = e.key === 'Enter';
		const pressedSlash = e.key === '/';
		const pressedBackspace = e.keyCode === KEYCODE_BACKSPACE;

		if (pressedEnter) {
			e.preventDefault();
			if (textInputEl.current) {
				textInputEl.current.blur();
			}
		} else if (pressedSlash) {
			e.preventDefault();
			onSlashPress();
		} else if (pressedBackspace) {
			if (onBackspacePress()) {
				e.preventDefault();
			}
		}
	};

	return (
		<Div>
			<HiddenPlaceholder ref={placeholderEl} />
			<Input
				ref={textInputEl}
				type="text"
				value={pathPart}
				onChange={onChange}
				onKeyDown={onKeyDown}
				onBlur={onFocusLost}
			/>
			<ValidityIndicator className={isValidDirectory ? 'valid' : 'invalid'} />
		</Div>
	);
};
