export interface Tree {
  name: string;
  icon: string;
  children: TreeChild[];
}

export interface TreeChild {
  name: string;
  icon: string;
  children: string;
}
