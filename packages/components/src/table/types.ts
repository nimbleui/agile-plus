import type {
  TableColumn,
  TableRowData,
  TableRowKey,
  TableSortState,
  TableSpanMethod,
} from '@agile-plus/ui/table';

/** 尺寸变体，单元格内边距与字号取自全局 padding / font-size Token。 */
export type TableSize = 'small' | 'middle' | 'large';

/**
 * 带样式 Table 的组件属性。
 *
 * 显式列出字段而不是 extends 导入类型：Vue SFC 编译器在部分环境下无法解析
 * 跨包导入类型作为 defineProps 基类型（与 Pagination 同一取舍）。状态通道与
 * 数据侧参数和 `@agile-plus/ui/table` 的 Root 同名同义；stripe / border / size /
 * loading / height 等纯视觉属性只属于本层，不透传给 Root。
 */
export interface TableProps {
  /** 行数据；分页由外部完成时即当前页数据 */
  data?: TableRowData[];

  /** 列模型，描述表头文案、取值字段、对齐、宽度、固定与排序 */
  columns?: TableColumn[];

  /** 行键字段名或取值函数；缺省读 key 字段 */
  rowKey?: TableRowKey;

  /** 是否启用选择列，默认 false */
  selection?: boolean;

  /** 行级可选判定，返回 false 的行不参与勾选与全选 */
  isRowSelectable?: (row: TableRowData) => boolean;

  /** 是否启用展开列，默认 false */
  expandable?: boolean;

  /** 是否启用列宽拖拽，默认 false；开启后表头右缘出现拖拽手柄 */
  resizable?: boolean;

  /** 单元格合并方法，逐格返回行列跨度（与 Element Plus span-method 同形） */
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

  /** 斑马纹，默认 false */
  stripe?: boolean;

  /** 全边框（纵向分隔线），默认 false */
  border?: boolean;

  /** 尺寸变体，默认 'middle' */
  size?: TableSize;

  /** 加载中：覆盖遮罩与旋转指示，默认 false */
  loading?: boolean;

  /** 表体固定高度；给出后表头吸顶、表体垂直滚动 */
  height?: number | string;

  /** 表体最大高度；超出后表头吸顶、表体垂直滚动 */
  maxHeight?: number | string;

  /** 空态文案，默认 '暂无数据' */
  emptyText?: string;

  /** 是否渲染表头，默认 true */
  showHeader?: boolean;

  /** table 的可访问名 */
  ariaLabel?: string;
}