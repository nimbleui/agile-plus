import type { ComputedRef } from 'vue';

import type {
  TableBodyRow,
  TableColumn,
  TableRowData,
  TableRowKey,
  TableSortState,
  TableSpanMethod,
} from '@agile-plus/primitives/table';

/**
 * Root 的props：数据、列模型与三条状态通道。
 *
 * 受控与否由各通道是否传入决定（`undefined` 是唯一判据），因此这里全部可选；
 * 缺省值交给 headless 与 primitives 的默认档，UI 层不做第二套兜底。
 */
export interface TableRootProps {
  /** 行数据；分页由外部完成时即当前页数据 */
  data?: TableRowData[];
  /** 列模型 */
  columns?: TableColumn[];
  /** 行键字段名或取值函数；缺省读 key 字段 */
  rowKey?: TableRowKey;
  /** 是否启用选择能力；选择列由 SelectionHead / SelectionCell 部件画出 */
  selection?: boolean;
  /** 行级可选判定，返回 false 的行不参与勾选与全选 */
  isRowSelectable?: (row: TableRowData) => boolean;
  /** 是否启用展开能力，影响空态 colspan 核算 */
  expandable?: boolean;
  /** 是否启用列宽拖拽；开启后表头渲染拖拽手柄 */
  resizable?: boolean;
  /** 单元格合并方法，逐格返回行列跨度 */
  spanMethod?: TableSpanMethod;
  /** 受控排序状态；null 是「明确不排序」的合法值 */
  sort?: TableSortState | null;
  /** 非受控初始排序 */
  defaultSort?: TableSortState | null;
  /** 受控已选行键集合 */
  selectedKeys?: string[];
  /** 非受控初始已选键 */
  defaultSelectedKeys?: string[];
  /** 受控展开行键集合 */
  expandedKeys?: string[];
  /** 非受控初始展开键 */
  defaultExpandedKeys?: string[];
  /** table 的可访问名；页面上有多张表格时用于区分 */
  ariaLabel?: string;
}

/** Root 向外同步状态通道与列宽拖拽的事件 */
export interface TableRootEmits {
  'update:sort': [value: TableSortState | null];
  'update:selectedKeys': [value: string[]];
  'update:expandedKeys': [value: string[]];
  columnResize: [key: string, width: number];
}

/**
 * Root 默认插槽的作用域数据。
 *
 * 表体行序列由 headless 算好后交回，`v-for` 写在调用侧——与 Pagination 同一
 * 契约：部件只描述结构与状态，画哪些行、放什么内容由消费者决定。
 */
export interface TableRootSlotProps {
  rows: TableBodyRow[];
  columns: readonly TableColumn[];
  sort: TableSortState | null;
  selectedKeys: readonly string[];
  expandedKeys: readonly string[];
  /** 生效列宽（含拖拽覆盖）的 CSS 值映射，供 colgroup 消费 */
  columnWidths: Record<string, string>;
  /** 表格布局算法：fixed / auto */
  layout: 'fixed' | 'auto';
}

/**
 * 行级上下文：TableRow 向内部的 TableCell 下发所属行项。
 *
 * 与 selectItem / radioGroupItem 同一套路——单元格只关心自己所属的那一行，
 * 合并跨度据此自动派生，消费者不必逐格手传 row / rowIndex。表头行无 item，
 * 注入到的值是 undefined。
 */
export interface TableRowContext {
  item: ComputedRef<TableBodyRow | undefined>;
}

/**
 * 数据行 / 表头行共用的 tr。
 *
 * `item` 只在表体数据行上传入：带上它才有选中 / 展开 / 禁用态与行事件；
 * 表头与汇总行不传，渲染为纯结构 tr。
 */
export interface TableRowProps {
  item?: TableBodyRow;
}

/** 行事件；payload 是表体行项（含 row / key / index），附带原生事件供阻止冒泡等用途 */
export interface TableRowEmits {
  rowClick: [item: TableBodyRow, event: MouseEvent];
  rowDblclick: [item: TableBodyRow, event: MouseEvent];
}

/** 表头单元格；column 引用列模型的 key，排序与固定列几何由此派生 */
export interface TableHeadProps {
  column?: string;
}

/**
 * 数据单元格；column 引用列模型的 key，对齐与固定列几何由此派生。
 *
 * 合并两条路径：显式 rowspan / colspan 直接生效（复合层手动合并）；
 * 否则在 Root 配了 spanMethod 时按所属行自动派生（row / rowIndex 缺省从行级上下文取）。
 */
export interface TableCellProps {
  column?: string;
  /** 行数据；缺省从 TableRow 下发的行级上下文取 */
  row?: TableRowData;
  /** 数据行下标；缺省从行级上下文取 */
  rowIndex?: number;
  /** 显式纵向合并行数；0 表示该格不渲染 */
  rowspan?: number;
  /** 显式横向合并列数；0 表示该格不渲染 */
  colspan?: number;
}

/** 空态行；colspan 缺省按列模型 + 选择列 + 展开列核算 */
export interface TableEmptyProps {
  colspan?: number;
}

/** 全选表头格 */
export interface TableSelectionHeadProps {
  /** 全选框的可访问名 */
  label?: string;
}

/** 行选择格 */
export interface TableSelectionCellProps {
  item: TableBodyRow;
  /** 行选择框的可访问名 */
  label?: string;
}

/** 展开触发按钮 */
export interface TableExpandTriggerProps {
  item: TableBodyRow;
}

/** 展开内容行；colspan 缺省与空态同源 */
export interface TableExpandedRowProps {
  item: TableBodyRow;
  colspan?: number;
}