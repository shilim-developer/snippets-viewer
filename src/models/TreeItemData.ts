export interface TreeItemData {
  name: string;
  icon: string;
  body?: string;
  expression?: string;
  isOutCustomRoot: boolean;
  disabled: boolean;
  children: TreeItemData[] | string;
}
