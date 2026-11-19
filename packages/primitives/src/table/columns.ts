import type { TableColumn, TableFixedOffset } from './types';

/** 拖拽改宽的缺省最小像素宽度：再窄就放不下表头文案与排序箭头了。 */
export const TABLE_DEFAULT_MIN_WIDTH = 60;

/** 选择列的缺省像素宽度（与样式层 --y-table-selection-col-width 同源）。 */
export const TABLE_SELECTION_COL_WIDTH = 48;

/** 展开列的缺省像素宽度（与样式层 --y-table-expand-col-width 同源）。 */
export const TABLE_EXPAND_COL_WIDTH = 44;

/**
 * 把表格的尺寸配置（列宽、表体高度）收成 CSS 值。
 *
 * 数字按 px 解释（只接受正有限数），字符串原样透传（'20%'、'12rem' 都合法）。
 * 非法数字回退 undefined，即不声明该尺寸、由表格布局自行分配。
 * 列宽与高度共用同一套换算规则，因此收敛为一个函数而不是各写一遍。
 *
 * @param size 尺寸配置。
 * @returns 可直接写进 style 的 CSS 值，未声明时为 undefined。
 */
export function resolveTableCssSize(size?: number | string): string | undefined {
  if (typeof size === 'string') return size;

  if (typeof size === 'number' && Number.isFinite(size) && size > 0) return `${size}px`;

  return undefined;
}

/**
 * 是否存在固定列。
 *
 * @param columns 列模型。
 * @returns 任一列声明了 fixed 即为 true。
 */
export function hasTableFixedColumns(columns: readonly TableColumn[]): boolean {
  return columns.some((column) => column.fixed !== undefined);
}

/**
 * 表格布局算法的选择。
 *
 * 任一列声明了宽度或固定时用 fixed 布局：auto 布局下列宽只是「建议」，
 * 浏览器会按内容重新分配，sticky 偏移赖以成立的确定列宽就不存在了。
 * 没有任何宽度声明时保持 auto，让短内容表格按内容自然收缩。
 *
 * @param columns 列模型。
 * @returns 交给 CSS table-layout 的值。
 */
export function resolveTableLayout(columns: readonly TableColumn[]): 'fixed' | 'auto' {
  const hasWidth = columns.some(
    (column) => column.fixed !== undefined || resolveTableCssSize(column.width) !== undefined
  );

  return hasWidth ? 'fixed' : 'auto';
}

/**
 * 固定列的 sticky 偏移与交界标记。
 *
 * 偏移由同侧在前的固定列宽度累加得出，因此固定列必须给数字宽度：
 * 缺宽度的固定列不产生偏移（退化为普通列），也不参与其他列的累加——
 * 用一个猜测的宽度去累加只会让后续所有固定列贴错位置。
 *
 * `edge` 只标记同侧最后一列：左侧是列序里最后一个 fixed-left，
 * 右侧是列序里第一个 fixed-right，滚动阴影只画在这两条交界上。
 *
 * @param columns 列模型，按从左到右的渲染顺序。
 * @returns 列键到 sticky 几何的映射，只包含生效的固定列。
 */
export function getTableFixedOffsets(columns: readonly TableColumn[]): Record<string, TableFixedOffset> {
  const offsets: Record<string, TableFixedOffset> = {};

  const fixedLeft = columns.flatMap((column) =>
    column.fixed === 'left' && isPositiveWidth(column.width) ? [{ key: column.key, width: column.width }] : []
  );
  const fixedRight = columns.flatMap((column) =>
    column.fixed === 'right' && isPositiveWidth(column.width) ? [{ key: column.key, width: column.width }] : []
  );

  let leftAcc = 0;

  fixedLeft.forEach((column, index) => {
    offsets[column.key] = {
      side: 'left',
      offset: leftAcc,
      edge: index === fixedLeft.length - 1,
    };
    leftAcc += column.width;
  });

  let rightAcc = 0;

  [...fixedRight].reverse().forEach((column, index) => {
    offsets[column.key] = {
      side: 'right',
      offset: rightAcc,
      edge: index === fixedRight.length - 1,
    };
    rightAcc += column.width;
  });

  return offsets;
}

/** 固定列偏移只认正有限数的像素宽度。 */
function isPositiveWidth(width: number | string | undefined): width is number {
  return typeof width === 'number' && Number.isFinite(width) && width > 0;
}

/**
 * 空态 / 展开内容行要横跨的列数。
 *
 * 选择列与展开列是部件额外画出来的，不在列模型里，因此 colspan 必须把它们
 * 算进去，否则空态文案只占第一列、剩下的格子空着。
 *
 * @param columns 列模型。
 * @param selection 是否启用选择列。
 * @param expandable 是否启用展开列。
 * @returns 总列数，至少为 1（没有任何列时空态仍要占满整行）。
 */
export function getTableColSpan(
  columns: readonly TableColumn[],
  selection: boolean,
  expandable: boolean
): number {
  return Math.max(columns.length + (selection ? 1 : 0) + (expandable ? 1 : 0), 1);
}

/**
 * 表格的最小像素宽度：所有数字列宽之和，加上选择 / 展开辅助列。
 *
 * 样式层把它落成 table 的 min-width：列宽总和超出容器时 min-width 压过 width:100%，
 * 表格溢出产生横向滚动，固定列才有用武之地。非数字宽度（百分比 / 缺省）不计入——
 * 它们由布局自行分配，无法预先累加。拖拽改宽后传入生效列即可让总宽随之更新。
 *
 * @param columns 生效列模型（含拖拽覆盖后的宽度）。
 * @param selection 是否启用选择列。
 * @param expandable 是否启用展开列。
 * @returns 最小像素宽度。
 */
export function getTableTotalWidth(
  columns: readonly TableColumn[],
  selection: boolean,
  expandable: boolean
): number {
  let total = 0;

  for (const column of columns) {
    if (typeof column.width === 'number' && Number.isFinite(column.width) && column.width > 0) {
      total += column.width;
    }
  }

  if (selection) total += TABLE_SELECTION_COL_WIDTH;
  if (expandable) total += TABLE_EXPAND_COL_WIDTH;

  return total;
}