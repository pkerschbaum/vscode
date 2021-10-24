import { URI } from "vs/base/common/uri";
import { ModeServiceImpl } from "vs/editor/common/services/modeServiceImpl";
import { getIconClasses as getIconClassesOriginal } from "vs/editor/common/services/getIconClasses";
import type { FileKind } from "@pkerschbaum/code-oss-file-service/out/vs/platform/files/common/files";

const modeService = new ModeServiceImpl();
export function getIconClasses(
  resource: URI | undefined,
  fileKind?: FileKind
): string[] {
  return getIconClassesOriginal(undefined, modeService, resource, fileKind);
}
