import * as vscode from 'vscode'; //Imports
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let slimeProcess: cp.ChildProcess | undefined;

export function startSlime(context: vscode.ExtensionContext) {

  const config = vscode.workspace.getConfiguration('slime');
  let slimePath = config.get<string>('exePath');

  if (!slimePath || slimePath === "") {
    slimePath = path.join(context.extensionPath, 'slime-app', 'SlimeHelper.exe');
  }

  console.log(`Starting Slime from: ${slimePath}`);

  if (fs.existsSync(slimePath)) {
    slimeProcess = cp.spawn(slimePath, [process.pid.toString()], {
      detached: true,
      stdio: 'ignore'
    });

    slimeProcess.unref();
  } else {
    vscode.window.showErrorMessage(`Could not find Slime Helper at: ${slimePath}`);
  }
}

//kills the software
export function stopSlime() {
  if (slimeProcess && slimeProcess.pid) {
    console.log(`Killing Slime process: ${slimeProcess.pid}`);

    try {
      cp.exec(`taskkill /PID ${slimeProcess.pid} /T /F`, (err) => {
        if (err) {
          console.log("Slime was already dead or could not be killed");
        }
      });
    } catch (e) {
      console.error("Error killing slime", e);
    }
  }
}