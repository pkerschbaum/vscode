import { URI } from "vs/base/common/uri";
import * as json from "vs/base/common/json";
import { ModeServiceImpl } from "vs/editor/common/services/modeServiceImpl";
import { getIconClasses as getIconClassesOriginal } from "vs/editor/common/services/getIconClasses";
import { FileIconThemeData } from "vs/workbench/services/themes/browser/fileIconThemeData";
import {
  IThemeExtensionPoint,
  ExtensionData,
} from "vs/workbench/services/themes/common/workbenchThemeService";
import type { FileKind } from "@pkerschbaum/code-oss-file-service/out/vs/platform/files/common/files";

import { getFileService } from "code-oss-file-icon-theme/fileservice-singleton";

export type FileIconTheme = {
  iconThemeCssRules: string;
  getIconClasses: (resource: URI | undefined, fileKind?: FileKind) => string[];
};
const modeService = new ModeServiceImpl();
export async function loadFileIconTheme(
  fileIconThemeUri: URI
): Promise<FileIconTheme> {
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

  const result: FileIconTheme = {
    iconThemeCssRules: cssRules,
    getIconClasses: (resource, fileKind) => {
      return getIconClassesOriginal(undefined, modeService, resource, fileKind);
    },
  };

  return result;
}
