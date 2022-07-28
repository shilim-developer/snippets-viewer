import * as fs from "fs";
import * as JSON5 from "json5";
import { join, resolve } from "path";
import {
  commands,
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
  Uri,
  window,
} from "vscode";
import { Environment, GroupByType } from "../environmentPath";
import { SnippetJSON } from "../models/SnippetJson";
import { SnippetManifest } from "../models/SnippetManifest";
import { TreeItemData } from "../models/TreeItemData";
import { TreeItemMergeData } from "../models/TreeItemMergeData";
import { FileService } from "../service/FileServiece";
import { TreeItemNode } from "./TreeItemNode";

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
        expression: `${this.treeList.length}`,
        disabled: false,
        children: fs
          .readdirSync(this.environment.snippetsFolder)
          .map((fileName, fileIndex) => {
            return {
              name: fileName.substring(0, fileName.lastIndexOf(".")),
              icon: "src",
              isOutCustomRoot: false,
              disabled: false,
              expression: `${this.treeList.length}.${fileIndex}`,
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
        expression: `${this.treeList.length}`,
        children: item.packageJSON.contributes.snippets.map(
          (snippetItem: SnippetManifest, snippetIndex: number) => ({
            name: snippetItem.language,
            icon: "src",
            body: snippetItem.language,
            isOutCustomRoot: false,
            disabled: false,
            expression: `${this.treeList.length}.${snippetIndex}`,
            children: join(item?.extensionPath || "", snippetItem.path),
          })
        ),
      });
    });
    if (this.environment.groupByType === GroupByType.language) {
      this.initListGroupByLanguage();
    }
  }

  /**
   * 初始化通过语言排序列表
   */
  initListGroupByLanguage(): void {
    const tempList: TreeItemMergeData[] = this.treeList
      .map((item) => {
        return (item.children as TreeItemData[]).map((child) => ({
          ...child,
          icon: item.icon,
          expression: item.expression,
          parent: item.name,
        }));
      })
      .flat();
    tempList.sort((s1, s2) => {
      const x1 = s1.name.toUpperCase();
      const x2 = s2.name.toUpperCase();
      if (x1 < x2) {
        return -1;
      }
      if (x1 > x2) {
        return 1;
      }
      return 0;
    });
    const tempObject: { [key: string]: TreeItemMergeData[] } = tempList.reduce<{
      [key: string]: TreeItemMergeData[];
    }>((prev, cur) => {
      (prev[cur.name] = prev[cur.name] || []).push(cur);
      return prev;
    }, {});
    this.treeList = Object.keys(tempObject).map((key, index) => ({
      name: key,
      icon: "src",
      body: key,
      isOutCustomRoot: false,
      disabled: false,
      children: tempObject[key].map<TreeItemData>(
        (snippetItem: TreeItemMergeData, snippetIndex: number) => ({
          name: snippetItem.parent,
          body: snippetItem.parent,
          icon: snippetItem.icon,
          isOutCustomRoot: snippetItem.icon === ".github",
          expression: `${index}.${snippetIndex}`,
          disabled: snippetItem.disabled,
          children: snippetItem.children,
        })
      ),
    }));
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
          const text = fs.readFileSync(
            join(element.treeNodeData.children),
            "utf8"
          );
          json = JSON5.parse(text);
          // 根据配置是否显示定位代码段功能
          if (this.environment.showTargetCodeBtn) {
            let lineNum = 0;
            text.split(/\r?\n/g).forEach((line) => {
              lineNum++;
              const lineArr = line.split(":");
              if (lineArr.length > 0) {
                const matchText = lineArr[0].match(/\"(.+?)\"/);
                if (
                  matchText?.length === 2 &&
                  Object.prototype.hasOwnProperty.call(json, matchText[1])
                ) {
                  json[matchText[1]].line = lineNum;
                }
              }
            });
          }
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
              expression: element.treeNodeData.expression,
              line: json[key].line,
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
   * 通过表达式获取TreeItemData
   * @param {string} expression 表达式
   * @return {TreeItemData} 树节点
   */
  getTreeItemDataByExpression(expression: string | undefined): TreeItemData {
    let treeItemData!: TreeItemData;
    if (expression) {
      const expressionArr = expression.split(".");
      for (let index = 0; index < expressionArr.length; index++) {
        const treeIndex = parseInt(expressionArr[index]);
        if (index === 0) {
          treeItemData = this.treeList[treeIndex];
        } else if (Array.isArray(treeItemData?.children)) {
          treeItemData = treeItemData.children[treeIndex];
        }
      }
    }
    return treeItemData;
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
   * 根据排序类型分组列表
   * @param {GroupByType} type 分组模式
   */
  public async groupList(type: GroupByType) {
    await this.environment.setGroupByType(type);
    this.refresh();
  }

  /**
   * 禁用/启用代码段
   * @param {TreeItemData} treeNodeData 树节点信息
   */
  disableSnippets(treeNodeData: TreeItemData) {
    const treeNode: TreeItemData = this.getTreeItemDataByExpression(
      treeNodeData.expression
    );

    if (treeNode) {
      const expression: string[] = treeNodeData.expression!.split(".");
      let treeListIndex = 0;
      if (this.environment.groupByType === GroupByType.plugins) {
        treeListIndex = parseInt(expression[0]);
      } else if (this.environment.groupByType === GroupByType.language) {
        treeListIndex = parseInt(expression[1]);
      }
      const treeNodeCache = this.customConfigCacheList[treeListIndex];
      treeNode.disabled = !treeNode.disabled;
      treeNodeCache.disabled = treeNode.disabled;
      if (this.environment.groupByType === GroupByType.plugins) {
        (treeNode.children as TreeItemData[]).forEach((child) => {
          child.disabled = treeNode.disabled;
        });
      }
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
  }

  /**
   * 打开代码段文件
   * @param {TreeItemData} treeNodeData 树节点数据
   * @return {Promise<void>}
   */
  async targetToFile(treeNodeData: TreeItemData): Promise<void> {
    const treeNode = this.getTreeItemDataByExpression(treeNodeData.expression);
    if (treeNode) {
      const textEdit = await window.showTextDocument(
        Uri.file(treeNode.children as string)
      );
      const stepNumber =
        (treeNodeData?.line || 0) - (textEdit.selection.active.line + 1);
      stepNumber !== 0 &&
        commands.executeCommand("cursorMove", {
          to: stepNumber >= 0 ? "down" : "up",
          by: "line",
          value: Math.abs(stepNumber),
        });
    }
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
