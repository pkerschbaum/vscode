/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LanguageId, LanguageIdentifier } from 'vs/editor/common/modes';

export const NULL_MODE_ID = 'vs.editor.nullMode';

export const NULL_LANGUAGE_IDENTIFIER = new LanguageIdentifier(NULL_MODE_ID, LanguageId.Null);
