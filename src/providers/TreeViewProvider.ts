import * as fs from "fs";
import { join, resolve } from "path";
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
  window,
} from "vscode";
import { Environment } from "../environmentPath";
import { SnippetJSON } from "../models/SnippetJson";
import { SnippetManifest } from "../models/SnippetManifest";
import { TreeItemData } from "../models/TreeItemData";
import { FileService } from "./../service/FileServiece";
import { TreeItemNode } from "./TreeItemNode";
const JSON5 = require("json5");

export class TreeViewProvider implements TreeDataProvider<TreeItemNode> {
  private _onDidChangeTreeData: EventEmitter<
    TreeItemNode | undefined | null | void
  > = new EventEmitter<TreeItemNode | undefined | null | void>();
  private context!: ExtensionContext;
  private treeList: TreeItemData[] = [];
  private customConfigCacheList: TreeItemData[] = [];
  private customDisposableList: Disposable[][] = [];
  private environment!: Environment;

  /**
   * 初始化
   * @param {ExtensionContext} context
   * @return {void}
   */
  public initialize(context: ExtensionContext): void {
    this.context = context;
    this.environment = new Environment(this.context);
    this.initList();
  }

  /**
   * 增加自定义代码段
   * @param {string} language
   * @param {object} json
   * @return {Disposable}
   */
  addCustomSnippets(
    language: string,
    json: { [key: string]: SnippetJSON }
  ): Disposable {
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
    return disposable;
  }

  /**
   * 初始化列表
   */
  initList() {
    this.treeList = [];
    this.customDisposableList.forEach((disposableList) => {
      disposableList.forEach((disposable) => {
        disposable.dispose();
      });
    });
    this.customDisposableList = [];
    // 加载外部自定义代码段
    if (this.environment.customSnippetsConfigUrl) {
      try {
        const customConfigList: TreeItemData[] = FileService.getJSON5File<
          TreeItemData[]
        >(this.environment.customSnippetsConfigJsonUrl, []);
        this.customConfigCacheList = customConfigList;
        customConfigList.forEach((item: TreeItemData, index) => {
          const disposableList: Disposable[] = [];
          this.treeList.push({
            name: item.name,
            icon: ".github",
            body: item.name,
            expression: `${index}`,
            isOutCustomRoot: true,
            disabled: item.disabled,
            children: (item.children as TreeItemData[]).map(
              (snippetItem: TreeItemData, childIndex) => {
                // 加入自定义代码段
                const json: { [key: string]: SnippetJSON } =
                  FileService.getJSON5File<{ [key: string]: SnippetJSON }>(
                    join(
                      this.environment.customSnippetsConfigUrl,
                      snippetItem.children as string
                    ),
                    {}
                  );
                if (!item.disabled) {
                  disposableList.push(
                    this.addCustomSnippets(snippetItem.name, json)
                  );
                }
                return {
                  name: snippetItem.name,
                  icon: "src",
                  expression: `${index}.${childIndex}`,
                  isOutCustomRoot: false,
                  disabled: snippetItem.disabled,
                  children: join(
                    this.environment.customSnippetsConfigUrl,
                    snippetItem.children as string
                  ),
                };
              }
            ),
          });
          this.customDisposableList.push(disposableList);
        });
      } catch (error) {
        console.error("自定义配置错误");
        window.showErrorMessage("自定义代码段配置错误");
      }
    }

    // 加载用户自定义代码段
    try {
      this.treeList.push({
        name: "user-snippets",
        icon: "vscode",
        body: "user-snippets",
        isOutCustomRoot: false,
        disabled: false,
        children: fs
          .readdirSync(this.environment.snippetsFolder)
          .map((fileName) => {
            return {
              name: fileName.substring(0, fileName.lastIndexOf(".")),
              icon: "src",
              isOutCustomRoot: false,
              disabled: false,
              children: join(this.environment.snippetsFolder, fileName),
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
        body: item?.packageJSON?.name,
        isOutCustomRoot: false,
        disabled: false,
        children: item.packageJSON.contributes.snippets.map(
          (snippetItem: SnippetManifest) => ({
            name: snippetItem.language,
            icon: "src",
            isOutCustomRoot: false,
            disabled: false,
            children: join(item?.extensionPath || "", snippetItem.path),
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
      if (Array.isArray(element.treeNodeData.children)) {
        return element.treeNodeData.children.map((item) => {
          return new TreeItemNode(item);
        });
      } else {
        let resultArr: string[] = [];
        let json: { [key: string]: SnippetJSON } = {};
        try {
          json = JSON5.parse(
            fs.readFileSync(join(element.treeNodeData.children), "utf8")
          );
          resultArr = Object.keys(json);
        } catch (error) {
          console.log(error);
          window.showErrorMessage("代码段文件错误");
        }
        return resultArr.map(
          (key) =>
            new TreeItemNode({
              name: key,
              icon: this.context.asAbsolutePath(join("img", "code.svg")),
              isOutCustomRoot: false,
              disabled: false,
              body: Array.isArray(json[key].body)
                ? (json[key].body as string[]).join("\n")
                : (json[key].body as string),
              children: "",
            })
        );
      }
    } else {
      // 不包含elment, 根节点
      return this.treeList.map((item) => {
        return new TreeItemNode(item);
      });
    }
  }

  /**
   * 代码段点击
   * @param {string} body 代码段内容
   * @return {void}
   */
  public handleItemClick(body: string): void {
    const editor = window.activeTextEditor;
    if (editor) {
      editor.insertSnippet(new SnippetString(body));
    }
  }

  /**
   * 刷新列表
   */
  public refresh(): void {
    this.initList();
    this._onDidChangeTreeData.fire();
  }

  /**
   * 禁用/启用代码段 仅限制一级文件夹
   * @param {TreeItemData} treeNodeData 树节点信息
   */
  disableSnippets(treeNodeData: TreeItemData) {
    if (!treeNodeData.expression) {
      return;
    }
    const treeListIndex = parseInt(treeNodeData.expression);
    const treeNode = this.treeList[treeListIndex];
    const treeNodeCache = this.customConfigCacheList[treeListIndex];
    treeNode.disabled = !treeNode.disabled;
    treeNodeCache.disabled = treeNode.disabled;
    (treeNode.children as TreeItemData[]).forEach((child) => {
      child.disabled = treeNode.disabled;
    });
    (treeNodeCache.children as TreeItemData[]).forEach((child) => {
      child.disabled = treeNodeCache.disabled;
    });
    FileService.writeFile(
      this.environment.customSnippetsConfigJsonUrl,
      JSON.stringify(this.customConfigCacheList, null, 2)
    );
    if (treeNode.disabled) {
      this.customDisposableList[treeListIndex]
        .splice(0, this.customDisposableList[treeListIndex].length)
        .forEach((disposable) => {
          disposable.dispose();
        });
    } else {
      try {
        const children = treeNode.children as TreeItemData[];
        const disposableList: Disposable[] = [];
        children.forEach((snippetItem: TreeItemData) => {
          const json: { [key: string]: SnippetJSON } =
            FileService.getJSON5File<{ [key: string]: SnippetJSON }>(
              resolve(snippetItem.children as string),
              {}
            );
          disposableList.push(this.addCustomSnippets(snippetItem.name, json));
        });
        this.customDisposableList[treeListIndex] = disposableList;
      } catch (error) {
        console.log(error);
      }
    }
    this._onDidChangeTreeData.fire();
  }

  /**
   * 销毁所有代码段不全注册
   */
  public dispose(): void {
    this.customDisposableList.forEach((disposableList) => {
      disposableList.forEach((disposable) => {
        disposable.dispose();
      });
    });
  }
}

export const treeViewProvider: TreeViewProvider = new TreeViewProvider();
