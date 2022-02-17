import { fork } from "child_process";
import * as path from "path";

export function deleteRecursiveUsingChildProcess(fsPath: string) {
  return new Promise<void>((resolve, reject) => {
    const child = fork(
      path.join(
        __dirname,
        "delete-recursive-using-child-process_child-script.js"
      ),
      [fsPath],
      { stdio: ["inherit", "inherit", "inherit", "ipc"] }
    );
    child.on("message", (m) => {
      if (m === "success") {
        resolve();
      } else {
        reject(m);
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      } else {
        resolve();
      }
    });
  });
}
