// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { GroupByType } from "./environmentPath";
import { TreeItemData } from "./models/TreeItemData";
import { treeItemDecorationProvider } from "./providers/TreeItemDecorationProvider";
import { treeViewProvider } from "./providers/TreeViewProvider";
import { pluginTreeView } from "./providers/PluginTreeView";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "snippets viewer" is now active!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  treeViewProvider.initialize(context);
  pluginTreeView.initialize(context, treeViewProvider);

  context.subscriptions.push(
    // vscode.window.registerFileDecorationProvider(treeItemDecorationProvider),
    vscode.window.onDidChangeActiveTextEditor((textEditor) => {
      if (textEditor && textEditor.document.languageId) {
        treeViewProvider.initByLanguage(textEditor.document.languageId);
      }
    }),
    vscode.commands.registerCommand("itemClick", (body: string) =>
      treeViewProvider.handleItemClick(body)
    ),
    vscode.commands.registerCommand("snippets-viewer.refresh", () =>
      treeViewProvider.refresh()
    ),
    vscode.commands.registerCommand("snippets-viewer.groupByPlugins", () =>
      treeViewProvider.groupList(GroupByType.plugins)
    ),
    vscode.commands.registerCommand("snippets-viewer.groupByLanguage", () =>
      treeViewProvider.groupList(GroupByType.language)
    ),
    vscode.commands.registerCommand(
      "snippets-viewer.disableSnippets",
      ({ treeNodeData }: { treeNodeData: TreeItemData }) =>
        treeViewProvider.disableSnippets(treeNodeData)
    ),
    vscode.commands.registerCommand(
      "snippets-viewer.enableSnippets",
      ({ treeNodeData }: { treeNodeData: TreeItemData }) =>
        treeViewProvider.disableSnippets(treeNodeData)
    ),
    vscode.commands.registerCommand(
      "snippets-viewer.targetToFile",
      ({ treeNodeData }: { treeNodeData: TreeItemData }) =>
        treeViewProvider.targetToFile(treeNodeData)
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() {
  treeViewProvider.dispose();
}
