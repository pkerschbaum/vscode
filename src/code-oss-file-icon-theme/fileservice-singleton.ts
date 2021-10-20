import { IFileService } from "@pkerschbaum/code-oss-file-service/out/vs/platform/files/common/files";
import { FileService } from "@pkerschbaum/code-oss-file-service/out/vs/platform/files/common/fileService";
import {
  ConsoleMainLogger,
  LogService,
} from "@pkerschbaum/code-oss-file-service/out/vs/platform/log/common/log";
import { Schemas } from "@pkerschbaum/code-oss-file-service/out/vs/base/common/network";
import { DiskFileSystemProvider } from "@pkerschbaum/code-oss-file-service/out/vs/platform/files/electron-browser/diskFileSystemProvider";

let fileServiceSingleton: undefined | IFileService = undefined;
export function getFileService(): IFileService {
  if (!fileServiceSingleton) {
    // bootstrap code-oss-file-service
    const logger = new ConsoleMainLogger();
    const logService = new LogService(logger);
    fileServiceSingleton = new FileService(logService);
    const diskFileSystemProvider = new DiskFileSystemProvider(logService);
    fileServiceSingleton.registerProvider(Schemas.file, diskFileSystemProvider);
  }

  return fileServiceSingleton;
}
