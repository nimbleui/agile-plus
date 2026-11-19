// 转发 primitives 的表格类型与纯几何函数：Components 层只直接依赖本包（pnpm 不链接
// 传递依赖），列宽 / 高度 / 布局算法这类无状态纯计算经此公开出口消费，与 CheckboxCheckedState
// 的转发同一约定（架构 2.1 允许的跨层向下引用）。
export type {
  TableAlign,
  TableBodyRow,
  TableCellSpan,
  TableCellSpanResult,
  TableColumn,
  TableFixedOffset,
  TableFixedSide,
  TableRowData,
  TableRowKey,
  TableSelectionState,
  TableSortOrder,
  TableSortState,
  TableSpanMethod,
  TableSpanMethodContext,
} from '@agile-plus/primitives/table';

export { resolveTableCssSize, resolveTableLayout } from '@agile-plus/primitives/table';

export type {
  TableCellProps,
  TableEmptyProps,
  TableExpandTriggerProps,
  TableExpandedRowProps,
  TableHeadProps,
  TableRootEmits,
  TableRootProps,
  TableRootSlotProps,
  TableRowEmits,
  TableRowProps,
  TableSelectionCellProps,
  TableSelectionHeadProps,
} from './types';

export { default as TableRoot } from './TableRoot.vue';
export { default as TableCaption } from './TableCaption.vue';
export { default as TableHeader } from './TableHeader.vue';
export { default as TableBody } from './TableBody.vue';
export { default as TableFooter } from './TableFooter.vue';
export { default as TableRow } from './TableRow.vue';
export { default as TableHead } from './TableHead.vue';
export { default as TableCell } from './TableCell.vue';
export { default as TableEmpty } from './TableEmpty.vue';
export { default as TableSelectionHead } from './TableSelectionHead.vue';
export { default as TableSelectionCell } from './TableSelectionCell.vue';
export { default as TableExpandTrigger } from './TableExpandTrigger.vue';
export { default as TableExpandedRow } from './TableExpandedRow.vue';