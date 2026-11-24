/**
 * Tree 的类型与常量。
 *
 * 对齐对象是企业级组件库里「树形控件」这一件事的共同形状：节点树描述数据、可见行描述
 * 展开之后的扁平结果、展开 / 选中 / 勾选各持一份键集合。本层只回答纯计算问题（怎么扁平化、
 * 父节点是什么态、这个按键该走到哪一行），不持有状态、不碰 DOM、不认识 Vue；
 * 状态归 headless 的 useVirtualTree，结构归 ui 层。
 *
 * 键集合是这三条通道唯一的记录方式：节点对象本身不能当键（低代码物料里的数据每次刷新都是
 * 新引用），下标又不能当键（展开收起会改变可见行下标）。所以一切状态都落在字符串键上，
 * 键的给出方式只有字段名一种——函数形式在这里不可用，因为画布 schema 必须能序列化它。
 */

/**
 * 节点数据的最小契约：非空对象。
 *
 * 不要求索引签名，因此消费者用 interface 声明的节点可直接赋值；具体字段由 TreeFieldNames
 * 动态读取，业务字段类型通过泛型 T 保留。
 */
export type TreeDataNode = object;

/** 节点键：由 {@link TreeFieldNames.key} 字段读出并字符串化，缺省见 {@link resolveTreeKey}。 */
export type TreeKey = string;

/**
 * 字段名配置。
 *
 * 只接受字段名字符串而不是取值函数：本仓库的组件要进低代码画布，props 必须可 JSON 序列化，
 * 函数形式无法来自 schema。代价是不能表达「键由多个字段拼出」，那种节点请在数据侧预处理。
 */
export interface TreeFieldNames {
  /**
   * 键字段名。
   *
   * @default 'key'
   */
  key?: string;

  /**
   * 子节点数组字段名。
   *
   * @default 'children'
   */
  children?: string;

  /**
   * 禁用标记字段名，值为 `true` 时该节点不可选中、不可勾选、键盘跳过。
   *
   * @default 'disabled'
   */
  disabled?: string;

  /**
   * 叶子标记字段名，值为 `true` 时强制视为叶子（不画箭头、不可展开）。
   *
   * 存在的理由不是「再多一个开关」：异步加载子节点的场景里，节点尚未加载时 `children` 是空的，
   * 但它不是叶子。用这个字段把「还没有子节点」与「没有子节点」区分开，将来接 lazy 不需要改 API。
   *
   * @default 'isLeaf'
   */
  leaf?: string;
}

/**
 * 字段名全部补齐之后的形状。
 */
export interface ResolvedTreeFieldNames {
  key: string;
  children: string;
  disabled: string;
  leaf: string;
}

/** 勾选三态，与 Checkbox 的三态词表一致；`indeterminate` 即半选。 */
export type TreeCheckState = 'checked' | 'indeterminate' | 'unchecked';

/**
 * 选中模式。
 *
 * 三个值互斥，因此用联合类型而不是 `multiple: boolean` + `selectable: boolean` 两个开关：
 * 后者组合出四种状态而其中两种（不可选却多选）没有意义。
 */
export type TreeSelectionMode = 'none' | 'single' | 'multiple';

/**
 * 索引里的一个节点：把字段读取的结果固化下来，后续所有算法都不再碰字段名。
 *
 * `childrenKeys` / `parentKey` 让级联勾选与键盘导航能用图遍历而不是递归完成——递归深度等于
 * 树深，十万级的链式结构（一级只有一个子节点的目录树很常见）会直接爆栈。
 */
export interface TreeIndexNode<T extends TreeDataNode = TreeDataNode> {
  /** 节点键。 */
  key: TreeKey;
  /** 原始节点数据，渲染时交回插槽。 */
  node: T;
  /** 父键，顶层为 null。 */
  parentKey: TreeKey | null;
  /** 深度，顶层为 0；`aria-level` 是它加一。 */
  level: number;
  /** 兄弟中的序号，1 起；`aria-posinset` 直接用它。 */
  posinset: number;
  /** 兄弟总数，1 起；`aria-setsize` 直接用它。 */
  setsize: number;
  /** 子节点键，顺序与数据一致；叶子为空数组。 */
  childrenKeys: TreeKey[];
  /** 是否禁用。 */
  disabled: boolean;
  /** 是否分支节点（有子节点且未被强制标记为叶子）。 */
  branch: boolean;
}

/**
 * 一次 O(全部节点) 遍历得到的树索引。
 *
 * 三条通道（展开、选中、勾选）都需要「某节点的父是谁、子有哪些、兄弟几个」，而可见行数组
 * 答不了这些——折叠的子树根本不在里面。索引只建一次，数据不变就不重建。
 */
export interface TreeIndex<T extends TreeDataNode = TreeDataNode> {
  /** 键到索引节点。 */
  nodes: Map<TreeKey, TreeIndexNode<T>>;
  /** 顶层节点键，顺序与数据一致。 */
  roots: TreeKey[];
  /**
   * 前序遍历得到的全部键。
   *
   * 两个方向各有用途：正向遍历保证父在子之前（自顶向下的勾选传递），反向遍历保证**每个节点
   * 出现在其后代之后**（自底向上的勾选汇总）。反向不是后序，但后序需要的偏序它已经给够了。
   */
  order: TreeKey[];
}

/**
 * 虚拟列表要渲染的一行。
 *
 * 一行就是「展开之后可见的一个节点」。字段只保留渲染与无障碍需要的，派生得出的一律不留
 * （例如 `parentKey` 已展开成 `parentIndex`，键盘导航要的是行下标而不是再查一次表）。
 */
export interface TreeRow<T extends TreeDataNode = TreeDataNode> {
  /** 节点键，v-for 的 key 与状态通道都引用它。 */
  key: TreeKey;
  /** 原始节点数据。 */
  node: T;
  /** 深度，顶层为 0。 */
  level: number;
  /** 在可见行数组中的下标，即虚拟列表的项下标。 */
  index: number;
  /** 兄弟中的序号，1 起；折叠与窗口外的兄弟**计入**总数，这是 `aria-setsize` 的真实语义。 */
  posinset: number;
  /** 同一父级下的兄弟总数。 */
  setsize: number;
  /** 父行的下标，顶层为 -1。 */
  parentIndex: number;
  /** 是否分支节点，决定画不画箭头、要不要输出 `aria-expanded`。 */
  branch: boolean;
  /** 分支节点当前是否展开；叶子恒为 false。 */
  expanded: boolean;
  /** 是否禁用。 */
  disabled: boolean;
}

/**
 * 键盘意图。
 *
 * `right` / `left` 只记录「按了哪个方向键」而不写成 expand / collapse：同一个键在不同节点上
 * 含义不同（收起的分支是展开、展开的分支是进入子节点、叶子是无操作），把结论放进意图名里
 * 会让上一层看上去已经知道结果。真正的解释在 {@link resolveTreeNavigation}。
 */
export type TreeKeyIntent =
  | { kind: 'none' }
  | { kind: 'move'; direction: 1 | -1 }
  | { kind: 'edge'; edge: 'first' | 'last' }
  | { kind: 'right' }
  | { kind: 'left' }
  | { kind: 'select' };

/**
 * 一次导航需要的行信息。
 *
 * 刻意是结构化的窄类型而不是整个 {@link TreeRow}：导航只读这五个量，把它写成 `TreeRow`
 * 会让「传入一个残缺对象」这种错误要到运行时才暴露。
 *
 * **契约**：必须是可见行数组本身，不能是切片或过滤后的副本——`parentIndex` 指的是可见行
 * 下标，切片会让它指向另一行。
 */
export interface TreeNavigationRow {
  key: TreeKey;
  parentIndex: number;
  branch: boolean;
  expanded: boolean;
  disabled: boolean;
}

/** 导航结果：新的活动行下标，外加至多一次展开或收起。 */
export interface TreeNavigationResult {
  /** 活动行下标；没有可移动的目标时等于入参，空列表为 -1。 */
  activeIndex: number;
  /** 需要展开的分支键，没有则为 null。 */
  expandKey: TreeKey | null;
  /** 需要收起的分支键，没有则为 null。 */
  collapseKey: TreeKey | null;
  /** 本次按键是否应当接管（`preventDefault`）。 */
  handled: boolean;
}

/** 树根的属性输入。 */
export interface TreeRootAttrsInput {
  /** 选中模式为 multiple 时输出 `aria-multiselectable`。 */
  multiselectable: boolean;
  /** 当前活动行的 id；没有活动行时不输出 `aria-activedescendant`。 */
  activeDescendantId?: string;
}

/** 树行的属性输入。 */
export interface TreeItemAttrsInput {
  /** 行 id，供 `aria-activedescendant` 引用。 */
  id: string;
  /** 深度，顶层为 0；输出为 `aria-level`（加一）。 */
  level: number;
  posinset: number;
  setsize: number;
  /** 是否分支节点；false 时不输出 `aria-expanded`。 */
  branch: boolean;
  expanded: boolean;
  /** 选中模式为 none 时不输出 `aria-selected`。 */
  selectable: boolean;
  selected: boolean;
  /** 勾选态；`undefined` 表示这棵树不带勾选框，此时不输出 `aria-checked`。 */
  checked?: TreeCheckState;
  /** 该行是否被 `aria-activedescendant` 指向，即键盘游标所在行；只落在 `data-active`，不产生 aria 属性。 */
  active: boolean;
  disabled: boolean;
}
