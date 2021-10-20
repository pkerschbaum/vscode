import { URI } from "vs/base/common/uri";
import * as json from "vs/base/common/json";
import { ILanguageExtensionPoint } from "vs/editor/common/services/modeService";
import { ModesRegistry } from "vs/editor/common/modes/modesRegistry";

import { getFileService } from "code-oss-file-icon-theme/fileservice-singleton";

export async function registerLanguagesOfExtensions(
  extensionsDirectoryUri: URI
) {
  const fileService = getFileService();

  const extensionDirStat = await fileService.resolve(extensionsDirectoryUri);
  if (!extensionDirStat.children) {
    return;
  }

  const extensions = extensionDirStat.children.filter(
    (child) => child.isDirectory
  );

  await Promise.all(
    extensions.map(async (extension) => {
      const filesOfExtension = await fileService.resolve(extension.resource);
      const packageJsons = filesOfExtension.children?.filter(
        (child) => child.name === "package.json"
      );
      if (!packageJsons || packageJsons.length !== 1) {
        return;
      }

      const packageJsonStat = packageJsons[0];
      const packageJsonFileContent = await fileService.readFile(
        packageJsonStat.resource
      );

      const parseErrors: json.ParseError[] = [];
      const packageJsonParsed = json.parse(
        packageJsonFileContent.value.toString(),
        parseErrors
      );
      if (parseErrors.length > 0) {
        throw new Error(
          `could not parse json! parseErrors=${JSON.stringify(parseErrors)}`
        );
      }

      if (Array.isArray(packageJsonParsed?.contributes?.languages)) {
        const languages: ILanguageExtensionPoint[] =
          packageJsonParsed.contributes.languages;
        for (const language of languages) {
          ModesRegistry.registerLanguage(language);
        }
      }
    })
  );
}
