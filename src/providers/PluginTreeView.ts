import {
  ExtensionContext,
  TreeItemCollapsibleState,
  TreeView,
  window,
} from "vscode";
import { TreeViewProvider } from "./TreeViewProvider";
import { TreeItemNode } from "./TreeItemNode";

class PluginTreeView {
  private treeView!: TreeView<TreeItemNode>;

  public initialize(
    context: ExtensionContext,
    treeDataProvider: TreeViewProvider
  ): void {
    this.treeView = window.createTreeView("plugin-view", {
      treeDataProvider,
    });
    context.subscriptions.push(
      // 保存展开状态
      this.treeView.onDidExpandElement((e) => {
        if (e.element.treeNodeData.expression) {
          console.log(e.element.treeNodeData.expression);

          treeDataProvider.setExpandStatus(
            e.element.treeNodeData.expression,
            TreeItemCollapsibleState.Expanded
          );
        }
      }),
      this.treeView.onDidCollapseElement((e) => {
        if (e.element.treeNodeData.expression) {
          treeDataProvider.clearExpandStatus(e.element.treeNodeData.expression);
        }
      })
    );
  }
}

export const pluginTreeView = new PluginTreeView();
