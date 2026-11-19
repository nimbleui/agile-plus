import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

import type {
  TableBodyRow,
  TableCellSpan,
  TableColumn,
  TableFixedOffset,
  TableRowData,
  TableRowKey,
  TableSelectionState,
  TableSortState,
  TableSpanMethod,
} from '@agile-plus/primitives/table';

/**
 * useTable 的配置选项。
 *
 * 三条状态通道（排序 / 选择 / 展开）各自独立受控：传 `sort` 即排序受控，
 * 传 `selectedKeys` 即选择受控，互不牵连——「排序交给后端、选择留在前端」
 * 是真实存在的组合。数据侧参数一律 `MaybeRefOrGetter`：封装层递下来的是
 * 响应式 props，裸值会在展开时固化成快照，接口换了一次数据表格还停在旧行上。
 */
export interface UseTableOptions {
  /**
   * 行数据。分页由外部完成时这里就是当前页的数据。
   *
   * @default []
   */
  data?: MaybeRefOrGetter<readonly TableRowData[] | undefined>;

  /**
   * 列模型，描述排序开关、取值字段、对齐与固定列。
   *
   * @default []
   */
  columns?: MaybeRefOrGetter<readonly TableColumn[] | undefined>;

  /**
   * 行键的给出方式：字段名或取值函数。
   *
   * 刻意不收 MaybeRefOrGetter：取值函数与 getter 在运行时无法区分，
   * `toValue` 会把键函数当 getter 空参调用。与 defaultValue 同为创建期快照，
   * 运行中更换 rowKey 属于重建表格的场景。
   *
   * @default 'key'
   */
  rowKey?: TableRowKey;

  /**
   * 是否启用选择能力。
   *
   * 只开关「选择这件事」，选择列画不画由 ui 部件决定；关闭时所有选择写入被吞掉。
   *
   * @default false
   */
  selection?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 行级可选判定，返回 false 的行不参与勾选与全选。
   *
   * @default 所有行可选
   */
  isRowSelectable?: (row: TableRowData) => boolean;

  /**
   * 是否启用展开能力，只影响空态 colspan 的列数核算。
   *
   * @default false
   */
  expandable?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 是否启用列宽拖拽。
   *
   * 开启后表头渲染拖拽手柄，拖动改列宽；固定列偏移随之重算。
   *
   * @default false
   */
  resizable?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 单元格合并方法，逐格返回行列跨度（与 Element Plus span-method 同形）。
   *
   * 返回 0 的格子不渲染，由相邻格子吞并；缺省不合并。
   */
  spanMethod?: TableSpanMethod;

  /**
   * 列宽拖拽抬起后的回调。
   *
   * @param key 被拖拽的列键。
   * @param width 提交后的像素宽度（已夹到最小宽度）。
   */
  onColumnResize?: (key: string, width: number) => void;

  /**
   * 受控排序状态。`null` 是「明确不排序」的合法受控值，`undefined` 才是未受控。
   *
   * @default undefined
   */
  sort?: MaybeRefOrGetter<TableSortState | null | undefined>;

  /**
   * 非受控模式的初始排序。
   *
   * @default null
   */
  defaultSort?: TableSortState | null;

  /** 排序变化回调，受控模式下同样触发，且此时它是新值唯一的落地路径。 */
  onSortChange?: (sort: TableSortState | null) => void;

  /**
   * 受控已选行键集合。
   *
   * @default undefined
   */
  selectedKeys?: MaybeRefOrGetter<readonly string[] | undefined>;

  /**
   * 非受控模式的初始已选键。
   *
   * @default []
   */
  defaultSelectedKeys?: readonly string[];

  /** 已选键变化回调，参数是新数组而不是就地修改的旧数组。 */
  onSelectedKeysChange?: (keys: string[]) => void;

  /**
   * 受控展开行键集合。
   *
   * @default undefined
   */
  expandedKeys?: MaybeRefOrGetter<readonly string[] | undefined>;

  /**
   * 非受控模式的初始展开键。
   *
   * @default []
   */
  defaultExpandedKeys?: readonly string[];

  /** 展开键变化回调。 */
  onExpandedKeysChange?: (keys: string[]) => void;
}

/**
 * useTable 的返回值。
 *
 * 契约与 usePagination 一致：`get*Props` 只返回可以直接 v-bind 的属性
 * （固定列的 sticky 偏移以 CSS Variable 形式放在 style 里，属于计算出的几何数据），
 * 事件处理器由部件通过 v-on 单独绑定到 toggleSort 等方法。
 */
export interface UseTableReturn {
  /** 生效的列模型 */
  columns: ComputedRef<readonly TableColumn[]>;

  /** 排序后的数据行，不含展开内容行 */
  sortedRows: ComputedRef<TableRowData[]>;

  /** 表体要渲染的行序列：数据行 + 紧随其后的展开内容行 */
  rows: ComputedRef<TableBodyRow[]>;

  /** 当前排序状态，null 表示数据原序 */
  sort: ComputedRef<TableSortState | null>;

  /**
   * 按表头点击语义推进排序：新列升序起步，同列 升序 → 降序 → 取消。
   *
   * 列不存在或不可排序时静默返回。
   */
  toggleSort(key: string): void;

  /** 直接设置排序状态；与当前值相同时不发事件。 */
  setSort(next: TableSortState | null): void;

  /** 已选行键集合，可能含其他页的键（跨页保留） */
  selectedKeys: ComputedRef<readonly string[]>;

  /** 当前页全选框的三态 */
  selectionState: ComputedRef<TableSelectionState>;

  /** 当前页所有可选行的键，全选的作用域 */
  selectableKeys: ComputedRef<readonly string[]>;

  /** 该行是否已选中 */
  isRowSelected(key: string): boolean;

  /** 该行是否可勾选；选择未启用时恒为 false */
  isRowSelectable(key: string): boolean;

  /**
   * 勾选 / 取消一行。
   *
   * @param checked 缺省按当前态取反；行不可选或选择未启用时静默返回。
   */
  toggleRowSelection(key: string, checked?: boolean): void;

  /**
   * 全选 / 取消当前页可选行，其他页已选键不受牵连。
   *
   * @param checked 缺省在全选框非 checked 时全选、checked 时取消。
   */
  toggleAllSelection(checked?: boolean): void;

  /** 清空所有已选键，含其他页保留的键。 */
  clearSelection(): void;

  /** 展开行键集合 */
  expandedKeys: ComputedRef<readonly string[]>;

  /** 该行是否展开 */
  isRowExpanded(key: string): boolean;

  /** 切换一行的展开态；键不在当前数据里时静默返回。 */
  toggleRowExpanded(key: string): void;

  /** 生效固定列的 sticky 几何，键为列键 */
  fixedOffsets: ComputedRef<Record<string, TableFixedOffset>>;

  /** 表格布局算法：有宽度声明时为 fixed，否则 auto */
  layout: ComputedRef<'fixed' | 'auto'>;

  /** 空态 / 展开内容行的 colspan，已含选择列与展开列 */
  colSpan: ComputedRef<number>;

  /** 表格最小像素宽度：生效数字列宽之和 + 选择 / 展开辅助列，供样式层落成 min-width 产生横向滚动 */
  totalColumnWidth: ComputedRef<number>;

  /** 是否启用列宽拖拽 */
  resizable: ComputedRef<boolean>;

  /** 生效列宽（含拖拽覆盖）的 CSS 值映射，键为列键，供 colgroup 消费 */
  columnWidths: ComputedRef<Record<string, string>>;

  /** 正在被拖拽的列键；null 表示没有进行中的拖拽，供样式层挂全局拖拽态 */
  resizingKey: Ref<string | null>;

  /** 直接设置某列像素宽度，夹到该列最小宽度；列不存在时忽略。 */
  setColumnWidth(key: string, width: number): void;

  /** 清空所有拖拽覆盖，列宽回到列模型配置。 */
  resetColumnWidths(): void;

  /**
   * 开始一次列宽拖拽，监听生命周期由 usePointerDrag 收口。
   *
   * @param key 列键。
   * @param startX 按下时指针横坐标。
   * @param startWidth 按下时该列像素宽度（由 ui 层量好传入）。
   */
  startColumnResize(key: string, startX: number, startWidth: number): void;

  /**
   * 单元格合并跨度。
   *
   * @param row 行数据。
   * @param columnKey 列键。
   * @param rowIndex 数据行下标。
   * @returns 行列跨度与 removed（rowspan / colspan 为 0 时 true，渲染层据此跳过该格）。
   */
  getCellSpan(row: TableRowData, columnKey: string, rowIndex: number): TableCellSpan & { removed: boolean };

  /** 数据行的属性表：选中 / 展开 / 禁用态 */
  getRowProps(item: TableBodyRow): Record<string, unknown>;

  /** 表头单元格的属性表，含 aria-sort 与固定列几何 */
  getHeadProps(key: string): Record<string, unknown>;

  /** 数据单元格的属性表，含对齐与固定列几何 */
  getCellProps(key: string): Record<string, unknown>;

  /** 排序触发按钮的属性表 */
  getSortTriggerProps(key: string): Record<string, unknown>;

  /** 展开触发按钮的属性表：aria-expanded + aria-controls */
  getExpandTriggerProps(key: string): Record<string, unknown>;

  /** 展开内容行 td 的 id，与 getExpandTriggerProps 的 aria-controls 同源。 */
  getExpandedRowId(key: string): string;
}