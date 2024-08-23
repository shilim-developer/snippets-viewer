import {
  Event,
  FileDecoration,
  FileDecorationProvider,
  ProviderResult,
  ThemeColor,
  Uri,
} from "vscode";

export class TreeItemDecorationProvider implements FileDecorationProvider {
  onDidChangeFileDecorations?: Event<Uri | Uri[] | undefined> | undefined;
  provideFileDecoration(uri: Uri): ProviderResult<FileDecoration> {
    if (uri.scheme === "snippets-viewer" && uri.authority === "true") {
      return {
        color: new ThemeColor("disabledForeground"),
        tooltip: "disabled",
      };
    } else {
      return;
    }
  }
}

export const treeItemDecorationProvider: TreeItemDecorationProvider =
  new TreeItemDecorationProvider();
