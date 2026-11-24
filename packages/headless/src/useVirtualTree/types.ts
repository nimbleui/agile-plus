import type { ComputedRef, MaybeRefOrGetter } from 'vue';

import type {
  TreeCheckState,
  TreeDataNode,
  TreeFieldNames,
  TreeKey,
  TreeRow,
  TreeSelectionMode,
} from '@agile-plus/primitives/tree';
import type { UseVirtualListReturn } from '../useVirtualList/types';

/** useVirtualTree 的配置。 */
export interface UseVirtualTreeOptions<T extends TreeDataNode = TreeDataNode> {
  /**
   * 节点树数据。
   *
   * 整棵换一份（异步加载新一层）与局部改动在这一层没有区别：索引按引用变化重建，
   * 键不变则三条状态通道都不受影响。就地改数组不会触发重建，这是响应式的通用约束，
   * 需要时传新数组。
   */
  data: MaybeRefOrGetter<readonly T[]>;

  /** 字段名映射，缺省用 primitives 的默认字段名。 */
  fields?: MaybeRefOrGetter<TreeFieldNames | undefined>;

  /**
   * 选中模式。
   *
   * 与 `checkable` 是两条正交的通道：前者是「当前行」（单选高亮，`aria-selected`），
   * 后者是「勾选框」（多选带半选，`aria-checked`）。文件浏览器只要前者，权限树只要后者，
   * 合并成一个开关就会让其中一类场景出现没有语义的另一种控件。
   *
   * @default 'single'
   */
  selection?: MaybeRefOrGetter<TreeSelectionMode | undefined>;

  /**
   * 是否启用父子级联勾选。
   *
   * 打开后 `checkedKeys` 的语义是「**被点亮的叶子与手动勾选的分支**」的最小集合：
   * 勾父会自动补齐后代，取消父会清空整棵子树，父的半选态由子节点回读得到。
   *
   * @default false
   */
  checkable?: MaybeRefOrGetter<boolean | undefined>;

  /** 受控展开键集合；`undefined` 表示非受控。 */
  expandedKeys?: MaybeRefOrGetter<readonly TreeKey[] | undefined>;

  /** 非受控模式的初始展开键。 @default [] */
  defaultExpandedKeys?: readonly TreeKey[];

  /** 展开键变化回调，受控与非受控都会触发。 */
  onExpandedKeysChange?: (keys: TreeKey[]) => void;

  /** 受控选中键集合；`undefined` 表示非受控。 */
  selectedKeys?: MaybeRefOrGetter<readonly TreeKey[] | undefined>;

  /** 非受控模式的初始选中键。 @default [] */
  defaultSelectedKeys?: readonly TreeKey[];

  /** 选中键变化回调，受控与非受控都会触发。 */
  onSelectedKeysChange?: (keys: TreeKey[]) => void;

  /** 受控勾选键集合；`undefined` 表示非受控。 */
  checkedKeys?: MaybeRefOrGetter<readonly TreeKey[] | undefined>;

  /** 非受控模式的初始勾选键。 @default [] */
  defaultCheckedKeys?: readonly TreeKey[];

  /** 勾选键变化回调，受控与非受控都会触发。 */
  onCheckedKeysChange?: (keys: TreeKey[]) => void;

  /**
   * 受控活动键（键盘焦点所在行）。
   *
   * 活动行不等于选中行：它是 `aria-activedescendant` 的指向，随方向键移动而不变动选中态。
   * 用键而不是下标记录——展开收起会插入或删除行，下标会指到另一行上。
   */
  activeKey?: MaybeRefOrGetter<TreeKey | null | undefined>;

  /** 非受控模式的初始活动键。 @default null */
  defaultActiveKey?: TreeKey | null;

  /** 活动键变化回调，受控与非受控都会触发。 */
  onActiveKeyChange?: (key: TreeKey | null) => void;

  /** 行高预估值，转给虚拟层。 */
  estimateSize?: MaybeRefOrGetter<number | undefined>;

  /** 视口上下各额外渲染的行数，转给虚拟层。 */
  overscan?: MaybeRefOrGetter<number | undefined>;
}

/**
 * useVirtualTree 的返回值。
 *
 * 虚拟层的几何量原样转发（padding、总高、绑定元素、丢弃测量），只去掉 `scrollToIndex`：
 * 行下标会随展开收起改变含义，树的外部调用方手里只有键。
 */
export interface UseVirtualTreeReturn<T extends TreeDataNode = TreeDataNode> extends Pick<
  UseVirtualListReturn,
  | 'paddingTop'
  | 'paddingBottom'
  | 'totalSize'
  | 'scrollTop'
  | 'viewportSize'
  | 'setViewportElement'
  | 'setContentElement'
  | 'invalidateMeasurements'
> {
  /** 展开之后的全部可见行，即虚拟列表的项序列。 */
  rows: ComputedRef<readonly TreeRow<T>[]>;

  /** 当前渲染窗口内的行，模板直接 v-for 它；行上的 `index` 仍是全局下标。 */
  visibleRows: ComputedRef<readonly TreeRow<T>[]>;

  /** 当前展开键集合。 */
  expandedKeys: ComputedRef<readonly TreeKey[]>;

  /** 当前选中键集合。 */
  selectedKeys: ComputedRef<readonly TreeKey[]>;

  /** 当前勾选键集合（级联后的最小集合）。 */
  checkedKeys: ComputedRef<readonly TreeKey[]>;

  /** 全部节点的勾选三态，含由子节点回读出的 `indeterminate`。 */
  checkStates: ComputedRef<ReadonlyMap<TreeKey, TreeCheckState>>;

  /** 当前活动键，没有则为 null。 */
  activeKey: ComputedRef<TreeKey | null>;

  /** 当前活动行的下标，行不可见时为 -1。 */
  activeIndex: ComputedRef<number>;

  /** 展开指定键；非分支节点与已展开节点无操作。 */
  expand(key: TreeKey): void;

  /** 收起指定键。 */
  collapse(key: TreeKey): void;

  /** 按当前展开态切换该行；禁用行、叶子与过期行对象都按最新键集合判断。 */
  toggleExpand(row: TreeRow<T>): void;

  /** 展开全部层级：一次写入而不是逐行调用，避免每次展开都重排一次行序列。 */
  expandAll(): void;

  /** 收起全部层级。 */
  collapseAll(): void;

  /** 按 `selection` 模式选中该行：单选为替换，多选为切换，`none` 与禁用行无操作。 */
  selectRow(row: TreeRow<T>): void;

  /** 清空选中：单选模式下点击已选中行不会取消，清空只有在这里做。 */
  clearSelection(): void;

  /** 切换该行勾选并级联子树；半选行按下去变为全选。禁用行与未启用勾选时无操作。 */
  toggleCheck(row: TreeRow<T>): void;

  /** 设置活动键；目标行存在时会被带进视口。 */
  setActiveKey(key: TreeKey | null): void;

  /**
   * 把指定键的行带进视口。
   *
   * 已经在视口内时不滚动；键处于折叠的祖先里时不可见，本方法不代替调用方展开祖先。
   */
  scrollToKey(key: TreeKey): void;

  /** 键盘导航处理器，绑定在 role="tree" 的元素上。 */
  onKeydown(event: KeyboardEvent): void;

  /** 树根的属性表（`role`、`tabindex`、`aria-activedescendant`）。 */
  getRootAttrs(): Record<string, unknown>;

  /** 某一行的属性表（`aria-level` / `aria-posinset` / `aria-setsize` / 三态）。 */
  getItemAttrs(row: TreeRow<T>): Record<string, unknown>;
}
