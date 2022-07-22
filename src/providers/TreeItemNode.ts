import { TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { TreeItemData } from "../models/TreeItemData";

export class TreeItemNode extends TreeItem {
  constructor(public readonly treeNodeData: TreeItemData) {
    super(
      treeNodeData.name,
      !!treeNodeData.children
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );
    const { name, icon, body, isOutCustomRoot, disabled } = treeNodeData;

    // init icon
    if (icon.includes("code.svg")) {
      this.iconPath = icon;
    } else {
      this.resourceUri = Uri.from({
        scheme: "shilim",
        authority: new String(disabled).toString(),
        path: `/${icon}`,
      });
    }

    // init command: 为每项添加点击事件的命令
    if (this.collapsibleState === TreeItemCollapsibleState.None) {
      this.command = {
        title: name, // 标题
        command: "itemClick", // 命令 ID
        tooltip: body, // 鼠标覆盖时的小小提示框
        arguments: [body],
      };
    }

    // init contextValue
    if (isOutCustomRoot) {
      if (disabled) {
        this.contextValue = "enableSnippets";
      } else {
        this.contextValue = "disableSnippets";
      }
    }
  }

  tooltip = this.treeNodeData.body;
}
