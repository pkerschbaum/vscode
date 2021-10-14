# @pkerschbaum/code-oss-file-service

VS Code ([microsoft/vscode](https://github.com/microsoft/vscode)) includes a rich "`FileService`" and "`DiskFileSystemProvider`" abstraction built on top of Node.js core modules (`fs`, `path`) and Electron's `shell` module.  
This package allows to use that abstraction as a standalone module for other projects. It is a fork of [microsoft/vscode](https://github.com/microsoft/vscode), reduced to all code parts related to `FileService` and `DiskFileSystemProvider`. The compiled output is ES6 compliant with source maps, declarations, and declaration maps included.

Minor changes to the code were necessary in order to allow standalone usage (e.g., there was a dependency on the `product.json` file of [microsoft/vscode](https://github.com/microsoft/vscode), this code parts were removed).  
See [this link](https://github.com/microsoft/vscode/compare/6d7222d52412f7c6e557ae448795f834e48ba0a1...pkerschbaum:code-oss-file-service) for all changes made to the VS Code source code.

Credits go to [microsoft/vscode](https://github.com/microsoft/vscode) for their awesome work!

## Usage

```typescript
import { Schemas } from "@pkerschbaum/code-oss-file-service/out/vs/base/common/network";
import {
  ConsoleMainLogger,
  LogService,
} from "@pkerschbaum/code-oss-file-service/out/vs/platform/log/common/log";
import { FileService } from "@pkerschbaum/code-oss-file-service/out/vs/platform/files/common/fileService";
import { DiskFileSystemProvider } from "@pkerschbaum/code-oss-file-service/out/vs/platform/files/electron-browser/diskFileSystemProvider";

const logger = new ConsoleMainLogger();
const logService = new LogService(logger);
const fileService = new FileService(logService);
const diskFileSystemProvider = new DiskFileSystemProvider(logService);
fileService.registerProvider(Schemas.file, diskFileSystemProvider);

// fileService is ready for use here
```
