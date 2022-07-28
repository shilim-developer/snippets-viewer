export interface TreeItemData {
  name: string;
  icon: string;
  body?: string;
  expression?: string;
  line?: number;
  isOutCustomRoot: boolean;
  disabled: boolean;
  children: TreeItemData[] | string;
}
