import type { TableColumn, TableRowData, TableSortState } from './types';

/**
 * 点击表头排序后的下一个状态。
 *
 * 循环是主流表格的单列排序约定：新列从升序开始，同一列按 升序 → 降序 → 取消 循环。
 * 取消回到 `null`（数据原序）而不是停在降序：用户需要一条回到原始顺序的路，
 * 否则「按录入顺序看数据」只能靠刷新页面。
 *
 * @param current 当前排序状态，null 表示未排序。
 * @param key 被点击的列键。
 * @returns 下一个排序状态；同一列第三次点击返回 null。
 */
export function getNextTableSortState(
  current: TableSortState | null,
  key: string
): TableSortState | null {
  if (current?.key !== key) return { key, order: 'asc' };

  return current.order === 'asc' ? { key, order: 'desc' } : null;
}

/**
 * 缺省的单元格值比较器。
 *
 * 规则刻意保守：空值（null / undefined / 非有限数）恒排最后，两个数字按数值比，
 * 其余一律转字符串按字典序比。不做 locale 感知——排序结果必须在 node 单测与
 * 浏览器里逐字一致，localeCompare 的输出随运行环境的 ICU 数据漂移。
 * 需要自然序、拼音序或业务权重的列由 `column.sorter` 自定义。
 *
 * @param a 左侧字段值。
 * @param b 右侧字段值。
 * @returns 负数表示 a 在前，正数表示 b 在前，0 表示相等。
 */
export function compareTableCellValues(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || (typeof a === 'number' && !Number.isFinite(a));
  const bEmpty = b === null || b === undefined || (typeof b === 'number' && !Number.isFinite(b));

  if (aEmpty || bEmpty) {
    if (aEmpty && bEmpty) return 0;

    return aEmpty ? 1 : -1;
  }

  if (typeof a === 'number' && typeof b === 'number') return a - b;

  const aText = String(a);
  const bText = String(b);

  if (aText < bText) return -1;
  if (aText > bText) return 1;

  return 0;
}

/**
 * 按排序状态返回排好序的行数组。
 *
 * 不修改入参，永远返回新数组。排序状态为 null、列不存在或列不可排序时原序返回：
 * 外部受控通道可能递进来一个与当前列模型不匹配的旧状态（列被动态移除），
 * 此时静默退回原序而不是抛错——表格仍要可用，排序只是暂时失效。
 *
 * 稳定性依赖 ES2019 起 Array.prototype.sort 的稳定排序保证：相等行保持原相对顺序，
 * 翻页与切换排序方向时不会看到同值行互相跳动。
 *
 * @param rows 原始行数组。
 * @param columns 列模型，提供 sortable 开关、取值字段与自定义比较器。
 * @param sort 排序状态。
 * @returns 新数组；降序通过取反比较器实现，空值因此排到最前（与升序镜像）。
 */
export function sortTableRows(
  rows: readonly TableRowData[],
  columns: readonly TableColumn[],
  sort: TableSortState | null
): TableRowData[] {
  const result = rows.slice();

  if (!sort) return result;

  const column = columns.find((item) => item.key === sort.key);

  if (!column?.sortable) return result;

  const field = column.dataIndex ?? column.key;
  const comparer =
    column.sorter ?? ((a: TableRowData, b: TableRowData) => compareTableCellValues(a[field], b[field]));

  result.sort((a, b) => (sort.order === 'asc' ? comparer(a, b) : -comparer(a, b)));

  return result;
}