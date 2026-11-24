import type {
  TreeCheckState,
  TreeDataNode,
  TreeFieldNames,
  TreeKey,
  TreeRow,
  TreeSelectionMode,
} from '@agile-plus/primitives/tree';

/**
 * VirtualTree 的组件属性。
 *
 * 三条状态通道都能受控，也能只给 `default*`；受控 prop 的缺省必须是 `undefined`，
 * 被转成空数组会让组件进入「受控且恒为空」的状态，非受控用法静默失效。
 */
export interface VirtualTreeProps<T extends TreeDataNode = TreeDataNode> {
  /** 节点树数据，默认空数组 */
  data?: readonly T[];

  /** 字段名映射，不传即按 `key` / `children` / `disabled` / `isLeaf` 读取 */
  fields?: TreeFieldNames;

  /**
   * 选中模式。
   *
   * 不传即交给无头层默认值 `'single'`；`'none'` 时不输出 `aria-selected`，行点击不再改选中态。
   */
  selection?: TreeSelectionMode;

  /**
   * 是否启用父子级联勾选。
   *
   * @default false
   */
  checkable?: boolean;

  /** 受控展开键集合，配合 `v-model:expandedKeys` 使用 */
  expandedKeys?: readonly TreeKey[];

  /**
   * 非受控模式的初始展开键。
   *
   * @default []
   */
  defaultExpandedKeys?: readonly TreeKey[];

  /** 受控选中键集合，配合 `v-model:selectedKeys` 使用 */
  selectedKeys?: readonly TreeKey[];

  /**
   * 非受控模式的初始选中键。
   *
   * @default []
   */
  defaultSelectedKeys?: readonly TreeKey[];

  /** 受控勾选键集合，配合 `v-model:checkedKeys` 使用；语义是无头层级联后的最小集合 */
  checkedKeys?: readonly TreeKey[];

  /**
   * 非受控模式的初始勾选键。
   *
   * @default []
   */
  defaultCheckedKeys?: readonly TreeKey[];

  /** 受控活动键（键盘焦点所在行），配合 `v-model:activeKey` 使用 */
  activeKey?: TreeKey | null;

  /** 视口高度，数字按 px 处理；不传时交给样式层或宿主设置 */
  height?: string | number;

  /** 行高预估值，同时决定滚动条长度 */
  estimateSize?: number;

  /** 视口外上下各预渲染的行数，不传即默认 3；显式 0 表示关闭预渲染 */
  overscan?: number;
}

/**
 * VirtualTree 的事件声明。
 */
export interface VirtualTreeEmits {
  /** 展开键变化时触发 */
  'update:expandedKeys': [keys: TreeKey[]];

  /** 选中键变化时触发 */
  'update:selectedKeys': [keys: TreeKey[]];

  /** 勾选键变化时触发，级联结果已含后代键 */
  'update:checkedKeys': [keys: TreeKey[]];

  /** 活动键变化时触发，即键盘焦点锚点移动到另一行 */
  'update:activeKey': [key: TreeKey | null];
}

/**
 * 行插槽的作用域参数。
 *
 * `node` 与 `row.node` 是同一份引用：低代码物料里的绑定路径写不到嵌套两层的表达式，
 * 给一份平铺的入口比让每个物料自己展开成本更低。
 */
export interface VirtualTreeRowSlotProps<T extends TreeDataNode = TreeDataNode> {
  /** 当前行。 */
  row: TreeRow<T>;

  /** 原始节点数据。 */
  node: T;

  /** 该行是否被选中（`selection` 通道，与勾选无关）。 */
  selected: boolean;
}

/** 展开箭头插槽的作用域参数。 */
export interface VirtualTreeToggleSlotProps<T extends TreeDataNode = TreeDataNode> {
  /** 当前行。 */
  row: TreeRow<T>;

  /** 当前是否展开；画成三角、加号还是 chevron 是样式层的决定。 */
  expanded: boolean;
}

/** 勾选框插槽的作用域参数。 */
export interface VirtualTreeCheckboxSlotProps<T extends TreeDataNode = TreeDataNode> {
  /** 当前行。 */
  row: TreeRow<T>;

  /** 三态勾选结论：行数据不带这一项，半选只能从这里取。 */
  state: TreeCheckState;
}
