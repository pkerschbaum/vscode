import { URI } from "vs/base/common/uri";
import * as json from "vs/base/common/json";
import { FileIconThemeData } from "vs/workbench/services/themes/browser/fileIconThemeData";
import {
  IThemeExtensionPoint,
  ExtensionData,
} from "vs/workbench/services/themes/common/workbenchThemeService";

import { getFileService } from "code-oss-file-icon-theme/fileservice-singleton";

export async function loadFileIconThemeCssRules(
  fileIconThemeUri: URI
): Promise<string> {
  const fileService = getFileService();

  const packageJsonStat = await fileService.readFile(
    URI.joinPath(fileIconThemeUri, "package.json")
  );

  const parseErrors: json.ParseError[] = [];
  const packageJsonParsed = json.parse(
    packageJsonStat.value.toString(),
    parseErrors
  );
  if (parseErrors.length > 0) {
    throw new Error(
      `could not parse json! parseErrors=${JSON.stringify(parseErrors)}`
    );
  }
  if (!Array.isArray(packageJsonParsed?.contributes?.iconThemes)) {
    throw new Error(
      `package.json content does not specify a icon theme! packageJsonParsed=${JSON.stringify(
        packageJsonParsed
      )}`
    );
  }

  const iconThemeExtensionPoint: IThemeExtensionPoint =
    packageJsonParsed.contributes.iconThemes[0];
  const iconThemeLocation = URI.joinPath(
    fileIconThemeUri,
    iconThemeExtensionPoint.path
  );
  const iconThemeExtensionData: ExtensionData = {
    extensionId: fileIconThemeUri.toString(),
    extensionPublisher: packageJsonParsed.publisher,
    extensionName: packageJsonParsed.name,
    extensionIsBuiltin: false,
  };
  const fileIconTheme = FileIconThemeData.fromExtensionTheme(
    iconThemeExtensionPoint,
    iconThemeLocation,
    iconThemeExtensionData
  );

  const cssRules = await fileIconTheme.ensureLoaded(fileService as any);
  if (!cssRules) {
    throw new Error(
      `loading the file icon theme did not result in any css rules`
    );
  }

  return cssRules;
}
