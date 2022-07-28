import { join, normalize, resolve } from "path";
import * as vscode from "vscode";

export enum GroupByType {
  "plugins" = "plugins",
  "language" = "language",
}

export class Environment {
  public isPortable: boolean = false;
  public userFolder: string = "";
  public path: string = "";
  public snippetsFolder: string = "";

  public get customConfig(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration("SnippetViewer");
  }

  public get customSnippetsConfigUrl(): string {
    return this.customConfig.get<string>("customUrl") || "";
  }

  public get customSnippetsConfigJsonUrl(): string {
    return join(this.customSnippetsConfigUrl, "config.json");
  }

  public get groupByType(): GroupByType {
    return (
      this.customConfig.get<GroupByType>("groupByType") || GroupByType.plugins
    );
  }

  public get showTargetCodeBtn(): boolean {
    return this.customConfig.get<boolean>("showTargetCodeBtn") || false;
  }

  constructor(context: vscode.ExtensionContext) {
    this.isPortable = !!process.env.VSCODE_PORTABLE;
    if (!this.isPortable) {
      this.path = resolve(context.globalStorageUri.fsPath, "../../..").concat(
        normalize("/")
      );
      this.userFolder = resolve(this.path, "User").concat(normalize("/"));
    } else {
      this.userFolder = resolve(this.path, "user-data/User").concat(
        normalize("/")
      );
    }
    this.snippetsFolder = this.userFolder.concat("/snippets/");
  }

  public setGroupByType(type: GroupByType): Thenable<void> {
    return this.customConfig.update("groupByType", type);
  }
}
