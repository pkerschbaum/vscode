/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Open ended enum at runtime
 * @internal
 */
export const enum LanguageId {
	Null = 0,
	PlainText = 1
}

/**
 * @internal
 */
export class LanguageIdentifier {

	/**
	 * A string identifier. Unique across languages. e.g. 'javascript'.
	 */
	public readonly language: string;

	/**
	 * A numeric identifier. Unique across languages. e.g. 5
	 * Will vary at runtime based on registration order, etc.
	 */
	public readonly id: LanguageId;

	constructor(language: string, id: LanguageId) {
		this.language = language;
		this.id = id;
	}
}
