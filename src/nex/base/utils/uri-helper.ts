import { URI } from 'vs/base/common/uri';
import { ResourceScheme } from 'nex/platform/file-types';

export const uriHelper = {
	parseUri(scheme: ResourceScheme, uri: string): URI | undefined {
		if (uri === '') {
			// empty uri is not allowed
			return;
		}
		if (uri.substr(uri.length - 1, 1) === ':') {
			uri = `${uri}/`;
		}

		try {
			// use Uri.file to handle specifics of fs paths, see
			// https://github.com/Microsoft/vscode-uri/blob/42f608bc8c934d066127b849081a5eeb7614bb30/src/index.ts#L682-L700
			return scheme === ResourceScheme.FileSystem
				? URI.file(`/${uri}`)
				: URI.parse(`${scheme}/${uri}`);
		} catch {
			// ignore
			return;
		}
	},
};
