/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FileAccess } from 'vs/base/common/network';
import { URI } from 'vs/base/common/uri';

/**
 * returns url('...')
 */
export function asCSSUrl(uri: URI): string {
	if (!uri) {
		return `url('')`;
	}
	return `url('${FileAccess.asBrowserUri(uri).toString(true).replace(/'/g, '%27')}')`;
}
