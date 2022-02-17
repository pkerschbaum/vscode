import * as fs from "fs";

if (typeof process.send !== "function") {
  throw new Error(
    `this script must be executed from a child process with IPC enabled`
  );
}

try {
  const fsPath = process.argv[2];
  if (typeof fsPath !== "string" || fsPath.trim().length === 0) {
    throw new Error(`fsPath (process.argv[2]) must be of type string`);
  }

  fs.rmSync(fsPath, { recursive: true, maxRetries: 3 });
  process.send("success");
} catch (outerErr) {
  process.send(outerErr.message);
}
