import type { TableColumn, TableSortState } from './types';

/**
 * 表头单元格的属性表。
 *
 * `aria-sort` 只落在正在排序的那一列上，其余列不输出而不是输出 'none'：
 * APG 约定同一时刻至多一列携带 aria-sort，逐列输出 none 会让读屏把整行表头
 * 播报成一串「未排序」。`data-sortable` 与 `data-align` 给样式层，
 * 与无障碍语义互不绑架（与 Pagination 的 data-state 同一约定）。
 *
 * @param column 列元数据；找不到列时输出最简 th 属性。
 * @param sort 当前排序状态。
 * @returns 可直接 v-bind 到 th 的属性集合。
 */
export function getTableHeadAttrs(
  column: TableColumn | undefined,
  sort: TableSortState | null
): Record<string, unknown> {
  const sortingOrder =
    column?.sortable === true && sort?.key === column.key ? sort.order : undefined;

  return {
    scope: 'col',
    'aria-sort': sortingOrder === 'asc' ? 'ascending' : sortingOrder === 'desc' ? 'descending' : undefined,
    'data-sortable': column?.sortable === true ? '' : undefined,
    'data-align': column?.headerAlign ?? column?.align ?? 'left',
    'data-fixed': column?.fixed,
  };
}

/**
 * 排序触发按钮的属性表。
 *
 * `data-order` 表达三态（asc / desc / none），样式层的箭头图形按它点亮；
 * 不用 aria-sort 做视觉选择器，理由与 Pagination 相同。
 *
 * @param key 按钮所在列的键。
 * @param sort 当前排序状态。
 * @returns 可直接 v-bind 到 button 的属性集合。
 */
export function getTableSortTriggerAttrs(
  key: string,
  sort: TableSortState | null
): Record<string, unknown> {
  const isSorting = sort?.key === key;

  return {
    'data-state': isSorting ? 'active' : 'inactive',
    'data-order': sort?.key === key ? sort.order : 'none',
  };
}

/**
 * 数据行的属性表。
 *
 * 选中态只用 `data-selected` 表达而不写 `aria-selected`：原生 table 语义里
 * aria-selected 只在 grid / treegrid 角色下有效，本库不做 grid 键盘导航，
 * 选中状态由行内复选框的 aria-checked 权威表达，行属性只服务样式。
 *
 * @param state 行的派生状态。
 * @returns 可直接 v-bind 到 tr 的属性集合。
 */
export function getTableRowAttrs(state: {
  selected: boolean;
  expanded: boolean;
  disabled: boolean;
}): Record<string, unknown> {
  return {
    'data-selected': state.selected ? '' : undefined,
    'data-expanded': state.expanded ? '' : undefined,
    'data-disabled': state.disabled ? '' : undefined,
  };
}

/**
 * 单元格的属性表。
 *
 * @param column 列元数据；找不到列时输出最简 td 属性。
 * @returns 可直接 v-bind 到 td 的属性集合。
 */
export function getTableCellAttrs(column: TableColumn | undefined): Record<string, unknown> {
  return {
    'data-align': column?.align ?? 'left',
    'data-fixed': column?.fixed,
    'data-ellipsis': column?.ellipsis === true ? '' : undefined,
  };
}

/**
 * 展开触发按钮的属性表。
 *
 * `aria-expanded` + `aria-controls` 是 APG 披露模式的权威表达：读屏据此播报
 * 「已展开 / 已折叠」并允许直接跳到被控制的内容行。
 *
 * @param expanded 所属数据行是否展开。
 * @param controlsId 展开内容行 td 的 id。
 * @returns 可直接 v-bind 到 button 的属性集合。
 */
export function getTableExpandTriggerAttrs(
  expanded: boolean,
  controlsId: string
): Record<string, unknown> {
  return {
    type: 'button',
    'aria-expanded': expanded,
    'aria-controls': controlsId,
    'data-state': expanded ? 'expanded' : 'collapsed',
  };
}