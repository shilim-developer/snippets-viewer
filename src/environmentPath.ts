import { normalize, resolve } from "path";
import * as vscode from "vscode";

export class Environment {
  public isPortable: boolean = false;
  public userFolder: string = "";
  public path: string = "";
  public snippetsFolder: string = "";

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
}
