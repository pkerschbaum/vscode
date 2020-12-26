import { URI } from 'vs/base/common/uri';
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
};
