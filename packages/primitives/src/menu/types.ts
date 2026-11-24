/** 菜单项与子菜单的稳定键，允许字符串与数字。 */
export type MenuKey = string | number;

/** 菜单布局模式。 */
export type MenuMode = 'vertical' | 'horizontal' | 'inline';

/** 菜单键盘导航方向。 */
export type MenuNavigationDirection = 'next' | 'previous' | 'first' | 'last';

/** 选中键转移输入。 */
export interface MenuSelectionInput {
  /** 当前选中键集合。 */
  selectedKeys: MenuKey[];
  /** 本次激活项的键。 */
  key: MenuKey;
  /** 是否允许多选；多选时再次激活同一项会取消选中。 */
  multiple: boolean;
}

/** 展开键转移输入。 */
export interface MenuOpenInput {
  /** 当前展开键集合。 */
  openKeys: MenuKey[];
  /** 本次切换的子菜单键。 */
  key: MenuKey;
  /** 目标展开状态。 */
  open: boolean;
  /** 当前子菜单的父级键；顶层为 null。 */
  parentKey: MenuKey | null;
  /** 是否开启同级手风琴模式。 */
  accordion: boolean;
  /** 当前已登记的子菜单键与父级关系，用于关闭后代和手风琴兄弟。 */
  items: MenuOpenItem[];
}

/** 展开算法使用的最小子菜单信息。 */
export interface MenuOpenItem {
  /** 子菜单键。 */
  key: MenuKey;
  /** 父级键；顶层为 null。 */
  parentKey: MenuKey | null;
}

/** 计算菜单项完整路径的输入。 */
export interface MenuKeyPathInput {
  /** 目标项键。 */
  key: MenuKey;
  /** 当前已登记的菜单项键与父级关系。 */
  items: MenuOpenItem[];
}

/** 菜单焦点索引计算输入。 */
export interface MenuNavigationInput {
  /** 当前项索引；没有当前项时为 -1。 */
  currentIndex: number;
  /** 当前层可用项数量。 */
  length: number;
  /** 导航方向。 */
  direction: MenuNavigationDirection;
  /** 到边界后是否绕回，默认 true。 */
  loop?: boolean;
}

/** typeahead 候选输入。 */
export interface MenuTypeaheadEntry {
  /** 候选项实例 id。 */
  id: string;
  /** 用于匹配的可读文本。 */
  textValue: string;
  /** 是否禁用。 */
  disabled: boolean;
}

/** typeahead 匹配输入。 */
export interface MenuTypeaheadInput {
  /** 当前层候选项。 */
  entries: MenuTypeaheadEntry[];
  /** 单个字符的搜索输入。 */
  search: string;
  /** 当前聚焦项 id；没有时为 null。 */
  currentId: string | null;
}
