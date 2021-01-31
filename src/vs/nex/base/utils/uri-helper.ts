import { URI, UriComponents } from 'vs/base/common/uri';
import { basename, extname } from 'vs/base/common/resources';
import { strings } from 'vs/nex/base/utils/strings.util';
import { RESOURCES_SCHEME } from 'vs/nex/platform/file-types';

export const uriHelper = {
	parseUri(scheme: RESOURCES_SCHEME, path: string) {
		if (path === '') {
			throw new Error(`empty uri is not allowed`);
		}

		// use Uri.file to handle specifics of fs paths, see
		// https://github.com/Microsoft/vscode-uri/blob/42f608bc8c934d066127b849081a5eeb7614bb30/src/index.ts#L682-L700
		return scheme === RESOURCES_SCHEME.FILE_SYSTEM ? URI.file(path) : URI.parse(`${scheme}${path}`);
	},

	extractNameAndExtension(uri: UriComponents): { fileName: string; extension?: string } {
		let fileName = basename(URI.from(uri));
		let extension: string | undefined = extname(URI.from(uri));

		if (strings.isNullishOrEmpty(extension)) {
			extension = undefined;
		} else {
			if (fileName.endsWith(extension)) {
				fileName = fileName.substring(0, fileName.length - extension.length);
			}
		}

		return { fileName, extension };
	},
};
