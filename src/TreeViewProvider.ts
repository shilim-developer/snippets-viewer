import * as fs from "fs";
import * as path from "path";
import { join } from "path";
import {
  CompletionItem,
  CompletionItemKind,
  Disposable,
  EventEmitter,
  ExtensionContext,
  extensions,
  languages,
  MarkdownString,
  ProviderResult,
  SnippetString,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
  workspace,
} from "vscode";
import { Environment } from "./environmentPath";
import { SnippetJSON } from "./models/SnippetJson";
import { SnippetManifest } from "./models/SnippetManifest";
import { Tree, TreeChild } from "./models/Tree";
const JSON5 = require("json5");

// 第一步：创建单项的节点(item)的类
export class TreeItemNode extends TreeItem {
  constructor(
    // readonly 只可读
    public readonly label: string,
    public readonly icon: string,
    public readonly body: string,
    public readonly children: TreeChild[] | string,
    public collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    if (icon.includes("code.svg")) {
      this.iconPath = Uri.file(join(__filename, "..", "..", icon));
    } else {
      this.resourceUri = Uri.parse(icon);
    }
    // command: 为每项添加点击事件的命令
    if (this.collapsibleState === TreeItemCollapsibleState.None) {
      this.command = {
        title: this.label, // 标题
        command: "itemClick", // 命令 ID
        tooltip: this.body, // 鼠标覆盖时的小小提示框
        arguments: [
          // 向 registerCommand 传递的参数。
          this.body,
        ],
      };
    }
  }

  tooltip = this.body;
}

export class TreeViewProvider implements TreeDataProvider<TreeItemNode> {
  private _onDidChangeTreeData: EventEmitter<
    TreeItemNode | undefined | null | void
  > = new EventEmitter<TreeItemNode | undefined | null | void>();
  private treeList: Tree[] = [];
  private context: ExtensionContext;
  private customDisposableList: Disposable[] = [];

  constructor(context: ExtensionContext) {
    this.context = context;
    this.initList();
  }

  /**
   * 增加自定义代码段
   * @param {string} language
   * @param {object} json
   */
  addCustomSnippets(
    language: string,
    json: { [key: string]: SnippetJSON }
  ): void {
    const disposable = languages.registerCompletionItemProvider(
      { scheme: "file", language },
      {
        provideCompletionItems() {
          return Object.keys(json).map((key) => {
            const snippetCompletion = new CompletionItem(
              {
                label: json[key].prefix,
                description: key,
                detail: "(custom)",
              },
              CompletionItemKind.Snippet
            );
            snippetCompletion.insertText = new SnippetString(
              Array.isArray(json[key].body)
                ? (json[key].body as string[]).join("\n")
                : (json[key].body as string)
            );
            snippetCompletion.detail = key;
            snippetCompletion.documentation =
              new MarkdownString().appendCodeblock(
                snippetCompletion.insertText.value
              );
            return snippetCompletion;
          });
        },
      }
    );
    this.customDisposableList.push(disposable);
    this.context.subscriptions.push(disposable);
  }

  /**
   * 初始化列表
   */
  initList() {
    this.treeList = [];
    for (const disposable of this.customDisposableList) {
      disposable.dispose();
    }
    this.customDisposableList = [];
    // 加载自定义代码段
    const customConfig = workspace.getConfiguration("SnippetViewer");
    if (customConfig.customUrl) {
      try {
        delete require.cache[join(customConfig.customUrl, "config.js")];
        const customConfigList: Tree[] = JSON5.parse(
          fs.readFileSync(
            path.join(customConfig.customUrl, "config.json"),
            "utf8"
          )
        );
        customConfigList.forEach((item: Tree) => {
          this.treeList.push({
            name: item.name,
            icon: ".github",
            children: item.children.map((snippetItem: TreeChild) => {
              // 加入自定义代码段
              let json: { [key: string]: SnippetJSON } = {};
              json = JSON5.parse(
                fs.readFileSync(
                  path.join(customConfig.customUrl, snippetItem.children),
                  "utf8"
                )
              );
              this.addCustomSnippets(snippetItem.name, json);
              return {
                name: snippetItem.name,
                icon: "src",
                children: join(customConfig.customUrl, snippetItem.children),
              };
            }),
          });
        });
      } catch (error) {
        console.error("自定义配置错误");
        window.showErrorMessage("自定义代码段配置错误");
      }
    }

    // 加载用户自定义代码段
    const environment = new Environment(this.context);
    try {
      this.treeList.push({
        name: "user-snippets",
        icon: "vscode",
        children: fs.readdirSync(environment.snippetsFolder).map((fileName) => {
          return {
            name: fileName.substring(0, fileName.lastIndexOf(".")),
            icon: "src",
            children: path.join(environment.snippetsFolder, fileName),
          };
        }),
      });
    } catch (error) {}

    // 加载扩展代码段
    let extensionsList = extensions.all;
    // console.log(extensionsList);
    extensionsList = extensionsList.filter(
      (item) => !!item?.packageJSON?.contributes?.snippets
    );
    extensionsList.forEach((item) => {
      this.treeList.push({
        name: item?.packageJSON?.name,
        icon: "plugin",
        children: item.packageJSON.contributes.snippets.map(
          (snippetItem: SnippetManifest) => ({
            name: snippetItem.language,
            icon: "src",
            children: path.join(item?.extensionPath || "", snippetItem.path),
          })
        ),
      });
    });
  }

  onDidChangeTreeData?:
    | import("vscode").Event<TreeItemNode | undefined | null | void> =
    this._onDidChangeTreeData.event;

  getTreeItem(element: TreeItemNode): TreeItem | Thenable<TreeItem> {
    return element;
  }

  getChildren(
    element?: TreeItemNode | undefined
  ): ProviderResult<TreeItemNode[]> {
    if (element) {
      if (Array.isArray(element.children)) {
        return element.children.map((item) => {
          return new TreeItemNode(
            item.name,
            item.icon,
            item.name,
            item.children,
            TreeItemCollapsibleState.Collapsed as TreeItemCollapsibleState
          );
        });
      } else {
        let resultArr: string[] = [];
        let json: { [key: string]: SnippetJSON } = {};
        try {
          json = JSON5.parse(
            fs.readFileSync(path.join(element.children), "utf8")
          );
          resultArr = Object.keys(json);
        } catch (error) {
          console.log(error);
          window.showErrorMessage("代码段文件错误");
        }
        return resultArr.map(
          (key) =>
            new TreeItemNode(
              key,
              "img/code.svg",
              Array.isArray(json[key].body)
                ? (json[key].body as string[]).join("\n")
                : (json[key].body as string),
              "",
              TreeItemCollapsibleState.None as TreeItemCollapsibleState
            )
        );
      }
    } else {
      // 不包含elment, 根节点
      return this.treeList.map((item) => {
        return new TreeItemNode(
          item.name,
          item.icon,
          item.name,
          item.children,
          TreeItemCollapsibleState.Collapsed as TreeItemCollapsibleState
        );
      });
    }
  }

  /**
   * 刷新列表
   */
  refresh(): void {
    this.initList();
    // this.treeList = [];
    // console.log(this.treeList);
    this._onDidChangeTreeData.fire();
  }

  public static initTreeViewItem(context: ExtensionContext) {
    // 实例化 TreeViewProvider
    const treeViewProvider = new TreeViewProvider(context);
    // registerTreeDataProvider：注册树视图
    window.registerTreeDataProvider("plugin-view", treeViewProvider);
    return treeViewProvider;
  }
}
