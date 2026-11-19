import { TABLE_EXPANDED_KEY_SUFFIX } from './types';

import type { TableBodyRow, TableRowData, TableRowKey } from './types';

/** 行键字段的缺省名，与主流表格库的 rowKey 缺省一致。 */
export const TABLE_DEFAULT_ROW_KEY = 'key';

/**
 * 解析一行的稳定键。
 *
 * 函数形式直接取返回值；字段形式读 `row[rowKey]`。字段缺失或值为 null/undefined
 * 时回退到行下标的字符串——表格仍要能渲染，但下标键在翻页与排序后指向不同的行，
 * 因此跨页选择、展开记忆这类依赖键稳定性的场景必须显式给出 rowKey。
 * 这条回退是兜底而不是推荐路径，文档里按已知限制说明。
 *
 * @param row 行数据。
 * @param rowKey 字段名或取值函数；缺省读 `key` 字段。
 * @param index 行在输入数组中的下标，仅作兜底。
 * @returns 字符串行键。
 */
export function resolveTableRowKey(
  row: TableRowData,
  rowKey: TableRowKey | undefined,
  index: number
): string {
  if (typeof rowKey === 'function') return String(rowKey(row));

  const value = row[rowKey ?? TABLE_DEFAULT_ROW_KEY];

  return value === null || value === undefined ? String(index) : String(value);
}

/**
 * 把数据行展开成表体要渲染的行序列。
 *
 * 每个数据行产出一条 `data` 项；键在 expandedKeys 里的数据行紧随其后产出一条
 * `expanded` 项，供展开内容行渲染。展开项继承数据行的 row 与 index，
 * 键加 {@link TABLE_EXPANDED_KEY_SUFFIX} 后缀避免与数据行撞键。
 *
 * @param rows 已排序的数据行。
 * @param rowKey 行键给出方式。
 * @param expandedKeys 处于展开状态的行键集合。
 * @returns 表体行序列，顺序与输入一致。
 */
export function getTableBodyRows(
  rows: readonly TableRowData[],
  rowKey: TableRowKey | undefined,
  expandedKeys: readonly string[]
): TableBodyRow[] {
  const result: TableBodyRow[] = [];

  rows.forEach((row, index) => {
    const key = resolveTableRowKey(row, rowKey, index);

    result.push({ type: 'data', key, row, index });

    if (expandedKeys.includes(key)) {
      result.push({ type: 'expanded', key: `${key}${TABLE_EXPANDED_KEY_SUFFIX}`, row, index });
    }
  });

  return result;
}