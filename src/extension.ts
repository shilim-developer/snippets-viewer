// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { TreeViewProvider } from "./TreeViewProvider";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "snippets viewer" is now active!'
  );

  // 实现树视图的初始化
  const treeViewProvider = TreeViewProvider.initTreeViewItem(context);

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let itemClickDisposable = vscode.commands.registerCommand(
    "itemClick",
    (body) => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        editor.insertSnippet(new vscode.SnippetString(body));
      }
    }
  );

  let refreshDisposable = vscode.commands.registerCommand(
    "snippets-viewer.refresh",
    () => treeViewProvider.refresh()
  );

  context.subscriptions.push(itemClickDisposable, refreshDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
