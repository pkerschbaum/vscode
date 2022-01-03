# @pkerschbaum/code-oss-file-service

VS Code ([microsoft/vscode](https://github.com/microsoft/vscode)) includes a rich "`FileService`" and "`DiskFileSystemProvider`" abstraction built on top of Node.js core modules (`fs`, `path`) and Electron's `shell` module.
This package allows to use that abstraction as a standalone module for other projects. It is a fork of [microsoft/vscode](https://github.com/microsoft/vscode), reduced to all code parts related to `FileService` and `DiskFileSystemProvider`. The compiled output is ES6 compliant with source maps, declarations, and declaration maps included.

The following changes were made to the code:

1. Minor changes in order to allow standalone usage (e.g., there was a dependency on the `product.json` file of [microsoft/vscode](https://github.com/microsoft/vscode), this code parts were removed).
2. Deleting directories recursively via the `DiskFileSystemProvider` does not use the fast variant that first moves the target to a temporary directory and then deletes it in the background, since this introduces problems with some devices on windows, e.g. external drives and network drives. See also this commit: [pkerschbaum/vscode/commit/e84f81c49f90cfebfdb0078d83b2695a2744c7c8](https://github.com/pkerschbaum/vscode/commit/e84f81c49f90cfebfdb0078d83b2695a2744c7c8).

See [this link](https://github.com/microsoft/vscode/compare/b2498a1a912811a78c68a5a03f2f0c2ad6ffe42a...pkerschbaum:code-oss-file-service) for all changes made to the VS Code source code.

Credits go to [microsoft/vscode](https://github.com/microsoft/vscode) for their awesome work!

## Usage

```typescript
import { Schemas } from "@pkerschbaum/code-oss-file-service/out/vs/base/common/network";
import {
  ConsoleMainLogger,
  LogService,
} from "@pkerschbaum/code-oss-file-service/out/vs/platform/log/common/log";
import { FileService } from "@pkerschbaum/code-oss-file-service/out/vs/platform/files/common/fileService";
import { DiskFileSystemProvider } from "@pkerschbaum/code-oss-file-service/out/vs/platform/files/node/diskFileSystemProvider";

const logger = new ConsoleMainLogger();
const logService = new LogService(logger);
const fileService = new FileService(logService);
const diskFileSystemProvider = new DiskFileSystemProvider(logService);
fileService.registerProvider(Schemas.file, diskFileSystemProvider);

// fileService is ready for use here
```
