import type {
  TreeDataNode,
  TreeFieldNames,
  TreeKey,
  TreeSelectionMode,
} from '@agile-plus/ui/virtual-tree';

/**
 * 带样式 VirtualTree 的组件属性。
 *
 * 显式列出字段而不是 extends 导入 ui 层同名类型：Vue SFC 编译器在部分环境下无法解析跨包导入
 * 类型作为 defineProps 基类型（与 `virtual-list/types.ts` 同一取舍）。字段与无样式层保持一致，
 * 一致性由 `virtual-tree.test.ts` 的 props 转发用例守住。
 *
 * 与 VirtualList 不同，这里没有「行怎么写」的属性：行内容由插槽决定，而树的行内容要同时照顾
 * 箭头、勾选框与标签三格，用 prop 传模板表达式只会多出一套 DSL。
 */
export interface VirtualTreeProps<T extends TreeDataNode = TreeDataNode> {
  /** 节点树数据；默认按 `key` / `children` / `disabled` / `isLeaf` 四个字段读取 */
  data?: readonly T[];
  /** 字段名映射；只接受字段名字符串，取值函数进不了低代码 schema */
  fields?: TreeFieldNames;
  /** 选中模式：`none` 不输出 `aria-selected`，`multiple` 输出 `aria-multiselectable` */
  selection?: TreeSelectionMode;
  /** 是否启用父子级联勾选，默认关闭 */
  checkable?: boolean;
  /** 受控展开键集合，配合 `v-model:expanded-keys` */
  expandedKeys?: readonly TreeKey[];
  /** 非受控模式的初始展开键 */
  defaultExpandedKeys?: readonly TreeKey[];
  /** 受控选中键集合，配合 `v-model:selected-keys` */
  selectedKeys?: readonly TreeKey[];
  /** 非受控模式的初始选中键 */
  defaultSelectedKeys?: readonly TreeKey[];
  /** 受控勾选键集合，配合 `v-model:checked-keys`；语义是级联之后的最小集合，半选不在其中 */
  checkedKeys?: readonly TreeKey[];
  /** 非受控模式的初始勾选键 */
  defaultCheckedKeys?: readonly TreeKey[];
  /** 受控活动键（键盘游标所在行），配合 `v-model:active-key` */
  activeKey?: TreeKey | null;
  /** 滚动容器高度；数字按 px，字符串原样交给 CSS；不传则由外层决定高度 */
  height?: string | number;
  /** 未测量项的预估高度，默认 40；它同时决定滚动条长度 */
  estimateSize?: number;
  /** 视口上下各预渲染的行数，默认 3；显式 0 表示关闭预渲染 */
  overscan?: number;
}

/**
 * 成品层转发给消费者的动作，按结构声明。
 *
 * 判据只有一条：**非受控用法下消费者自己做不到**。展开、选中、勾选、活动四条通道都能用
 * `v-model` 直接写，所以 `expand` / `collapse` / `selectRow` / `setActiveKey` / `toggleCheck`
 * 不在这里重复；剩下的几个要么需要全部节点键（`expandAll`），要么根本没有对应的 prop
 * （滚动定位与清空选中）。
 *
 * 区间状态（`scrollTop` / `viewportSize`）也不从这里读，与 VirtualList 同一取舍：需要
 * 「滚到底加载更多」的消费者应当用 ui 层组件或直接绑 `useVirtualTree`。
 */
export interface VirtualTreeHandle {
  expandAll(): void;
  collapseAll(): void;
  clearSelection(): void;
  scrollToKey(key: TreeKey): void;
  invalidateMeasurements(): void;
}
