export interface TreeItemData {
  name: string;
  icon: string;
  body?: string;
  expression?: string;
  originExpression?: string;
  line?: number;
  isOutCustomRoot: boolean;
  configUrl?: string;
  configIndex?: number;
  disabled: boolean;
  children: TreeItemData[] | string;
}
