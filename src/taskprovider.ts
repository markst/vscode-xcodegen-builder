import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

import { ProjectConfig } from "./projectconfig";

export class XCodeGenTaskProvider implements vscode.TaskProvider {
  private extensionPath: string;

  constructor(extensionPath: string) {
    this.extensionPath = extensionPath;
  }

  private createNpmXcodegenTask(
    targetName: string,
    projectFilePath: string
  ): vscode.Task {
    return new vscode.Task(
      { type: "shell", task: "xcodegen" },
      vscode.TaskScope.Workspace,
      `Generate xcodeproj for ${targetName}`,
      "XcodeGen",
      new vscode.ShellExecution(
        "npm",
        ["run", "xcodegen", "--", "-s", projectFilePath],
        { cwd: this.extensionPath }
      )
    );
  }

  private createCleanTask(
    targetName: string,
    derivedDataPath: string
  ): vscode.Task {
    const resultBundlePath = `${derivedDataPath}/Result.xcresult`;
    return new vscode.Task(
      { type: "shell", target: targetName },
      vscode.TaskScope.Workspace,
      "Clean build results",
      "XcodeGen",
      new vscode.ShellExecution(`rm -R -f ${resultBundlePath}`)
    );
  }

  private createXcodebuildTask(
    targetName: string,
    derivedDataPath: string
  ): vscode.Task {
    const xcodebuildTask = new vscode.Task(
      { type: "process", target: targetName },
      vscode.TaskScope.Workspace,
      "Build using xcodebuild",
      "XcodeGen",
      new vscode.ProcessExecution("xcodebuild", [
        "-scheme",
        targetName,
        "-configuration",
        "Debug",
        "-sdk",
        "${command:ios-debug.targetSdk}",
        "-derivedDataPath",
        derivedDataPath,
        "-allowProvisioningUpdates",
        "ARCHS=arm64",
      ])
    );
    xcodebuildTask.group = vscode.TaskGroup.Build;
    xcodebuildTask.isBackground = false;
    xcodebuildTask.presentationOptions = {
      reveal: vscode.TaskRevealKind.Always,
    };
    return xcodebuildTask;
  }

  provideTasks(
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Task[]> {
    let tasks: vscode.Task[] = [];
    const projectFilePath = path.join(
      vscode.workspace.rootPath || "",
      "project.yml"
    );

    if (fs.existsSync(projectFilePath)) {
      const fileContents = fs.readFileSync(projectFilePath, "utf8");
      const projectConfig = yaml.load(fileContents) as ProjectConfig;

      if (projectConfig && projectConfig.targets) {
        for (const targetName in projectConfig.targets) {
          const derivedDataPath = `~/Library/Developer/Xcode/DerivedData/${targetName}`;
          const workspaceRoot = vscode.workspace.rootPath || "";

          tasks.push(this.createNpmXcodegenTask(targetName, projectFilePath));
          tasks.push(this.createCleanTask(targetName, derivedDataPath));
          tasks.push(this.createXcodebuildTask(targetName, derivedDataPath));
        }
      }
    }

    return tasks;
  }

  resolveTask(
    task: vscode.Task,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Task> {
    return undefined;
  }
}
