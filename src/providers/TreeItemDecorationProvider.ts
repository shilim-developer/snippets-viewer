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
    if (uri.authority === "false") {
      return;
    }
    return {
      color: new ThemeColor("disabledForeground"),
      tooltip: "disabled",
    };
  }
}

export const treeItemDecorationProvider: TreeItemDecorationProvider =
  new TreeItemDecorationProvider();
