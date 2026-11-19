import type { TableCellSpan, TableCellSpanResult } from './types';

/**
 * 把单个跨度值收成「非负整数」。
 *
 * 0 是合法且有意义的取值——表示该格被相邻格吞并、不渲染，因此不能当非法值回退到 1。
 * 负数、非有限数与缺省一律回退到 1（不合并），小数向下取整。
 */
function normalizeSpan(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 1;

  return Math.floor(value);
}

/**
 * 归一化 spanMethod 的返回值为确定的行列跨度。
 *
 * 兼容对象与数组两种主流写法，缺省返回 1×1。纯函数、不读 DOM，
 * 便于在 node 环境单测各种非法与边界输入。是否「被吞并」由调用方按
 * `rowspan === 0 || colspan === 0` 判定，本函数只负责把值收合法。
 *
 * @param result spanMethod 的原始返回。
 * @returns 行列跨度，均为非负整数。
 */
export function resolveTableCellSpan(result: TableCellSpanResult): TableCellSpan {
  if (Array.isArray(result)) {
    return { rowspan: normalizeSpan(result[0]), colspan: normalizeSpan(result[1]) };
  }

  if (result !== null && result !== undefined) {
    return { rowspan: normalizeSpan(result.rowspan), colspan: normalizeSpan(result.colspan) };
  }

  return { rowspan: 1, colspan: 1 };
}