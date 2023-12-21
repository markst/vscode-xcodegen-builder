import * as vscode from 'vscode';
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

import { XCodeGenTaskProvider } from "./taskprovider";

class XcodeGenExtension {
  static projectYmlContent(appName: string, bundleIdPrefix: string): string {
    const projectYmlObject = {
      name: appName,
      options: {
        bundleIdPrefix: bundleIdPrefix,
      },
      targets: {
        [appName]: {
          type: "application",
          platform: "iOS",
          deploymentTarget: "14.0",
          sources: ["Application"],
          dependencies: [{ sdk: "SwiftUI.framework" }],
          settings: {
            base: {
              GENERATE_INFOPLIST_FILE: true,
              CURRENT_PROJECT_VERSION: 1,
              MARKETING_VERSION: 1,
              OTHER_LDFLAGS:
                "-Xlinker -interposable -Xlinker -undefined -Xlinker dynamic_lookup",
            },
          },
        },
      },
    };

    return yaml.dump(projectYmlObject);
  }

  static applicationSwiftContent(): string {
    return `
import SwiftUI

@main
struct Application: App {
  var body: some Scene {
    WindowGroup {
      Rectangle().fill(.red)
    }
  }
}
`;
  }

  static launchJsonContent(appName: string, bundleIdPrefix: string): string {
    const launchJsonObject = {
      version: "0.2.0",
      configurations: [
        {
          name: "Launch",
          type: "lldb",
          request: "launch",
          program: `~/Library/Developer/Xcode/DerivedData/${appName}/Build/Products/Debug-\${command:ios-debug.targetSdk}/${appName}.app`,
          iosBundleId: `${bundleIdPrefix}.${appName}`,
          iosTarget: "select",
          preLaunchTask: "XcodeGen: Build using xcodebuild",
        },
      ],
    };
    launchJsonObject.configurations.push();
    return JSON.stringify(launchJsonObject, null, 2);
  }

  async createProjectFiles(
    folderUri: vscode.Uri,
    appName: string,
    bundleIdPrefix: string
  ): Promise<void> {
    const rootPath = folderUri.fsPath;
    const projectYmlPath = path.join(rootPath, "project.yml");
    const applicationSwiftPath = path.join(
      rootPath,
      "Application",
      "Application.swift"
    );
    const launchJsonPath = path.join(rootPath, ".vscode", "launch.json");

    fs.mkdirSync(path.join(rootPath, ".vscode"), { recursive: true });
    fs.mkdirSync(path.join(rootPath, "Application"), { recursive: true });

    fs.writeFileSync(
      projectYmlPath,
      XcodeGenExtension.projectYmlContent(appName, bundleIdPrefix)
    );
    fs.writeFileSync(
      applicationSwiftPath,
      XcodeGenExtension.applicationSwiftContent()
    );
    fs.writeFileSync(
      launchJsonPath,
      XcodeGenExtension.launchJsonContent(appName, bundleIdPrefix)
    );

    return Promise.resolve();
  }

  async createLaunchJson(
    folderUri: vscode.Uri,
    appName: string,
    bundleIdPrefix: string
  ): Promise<void> {
    const rootPath = folderUri.fsPath;
    const launchJsonPath = path.join(rootPath, ".vscode", "launch.json");

    fs.mkdirSync(path.join(rootPath, ".vscode"), { recursive: true });
    fs.writeFileSync(
      launchJsonPath,
      XcodeGenExtension.launchJsonContent(appName, bundleIdPrefix)
    );

    return Promise.resolve();
  }
}

export function activate(context: vscode.ExtensionContext): void {
  // Register task provider:
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(
      "xcodegen",
      new XCodeGenTaskProvider(context.extensionPath)
    )
  );

  // Register generate project command:
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "xcodegenbuilder.generate-project",
      async () => {
        const folderUri = await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectFiles: false,
          canSelectMany: false,
          openLabel: "Select Folder",
        });

        if (!folderUri || folderUri.length === 0) {
          vscode.window.showInformationMessage("No folder selected");
          return;
        }

        const appName = await vscode.window.showInputBox({
          prompt: "Enter the Application Name",
        });
        if (!appName) return;

        const bundleIdPrefix = await vscode.window.showInputBox({
          prompt: "Enter the Bundle ID Prefix",
        });
        if (!bundleIdPrefix) return;

        const xcodegen = new XcodeGenExtension();
        await xcodegen
          .createProjectFiles(folderUri[0], appName, bundleIdPrefix)
          .then(() => {
            vscode.commands.executeCommand(
              "vscode.openFolder",
              folderUri[0],
              true
            );
          });
      }
    )
  );

  // Register generate `launch.json` command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "xcodegenbuilder.generate-launch",
      async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          vscode.window.showErrorMessage("No workspace folder is open.");
          return;
        }

        // Assuming we use the first workspace folder for simplicity
        const folderUri = workspaceFolders[0].uri;

        const appName = await vscode.window.showInputBox({
          prompt: "Enter the Application Name",
        });
        if (!appName) return;

        const bundleIdPrefix = await vscode.window.showInputBox({
          prompt: "Enter the Bundle ID Prefix",
        });
        if (!bundleIdPrefix) return;

        const xcodegen = new XcodeGenExtension();
        await xcodegen
          .createLaunchJson(folderUri, appName, bundleIdPrefix)
          .then(() => {
            vscode.window.showInformationMessage(
              "launch.json file created successfully."
            );
          });
      }
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
