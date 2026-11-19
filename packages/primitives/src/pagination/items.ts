import type {
  PaginationConfig,
  PaginationDirection,
  PaginationEllipsisSide,
  PaginationItem,
} from './types';

/** 缺省每页条数，与主流表格库一致。 */
export const PAGINATION_DEFAULT_PAGE_SIZE = 10;

/** 缺省的当前页左右页码数。 */
export const PAGINATION_DEFAULT_SIBLING_COUNT = 1;

/** 缺省的首尾钉住页码数。 */
export const PAGINATION_DEFAULT_BOUNDARY_COUNT = 1;

/** 缺省当前页，即第 1 页。 */
export const PAGINATION_DEFAULT_PAGE = 1;

/**
 * 把外部输入收成「可当计数用的正整数」。
 *
 * 每页条数用它：0 条一页既除不动也画不出窗口，因此 0、负数、NaN 与 undefined
 * 一律回退到缺省值。
 *
 * @param value 原始输入。
 * @param fallback 回退值。
 * @returns 向下取整后的正整数，否则 fallback。
 */
function toPositiveCount(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;

  return Math.floor(value);
}

/**
 * 把窗口宽度收成「非负整数」。
 *
 * 与每页条数的分界在于 **0 是有意义的一档**：`siblingCount: 0` 是「中间只留当前页」，
 * `boundaryCount: 0` 是「首尾都不钉」，都是用户明确表达过的形态。把它们当非法值回退到
 * 1，等于把「只要当前页」听成「当前页加左右各一页」——所以这里只挡负数与非有限数，
 * 小数仍然向下取整（0.5 页兄弟就是没有兄弟）。
 *
 * @param value 原始输入。
 * @param fallback 回退值。
 * @returns 向下取整后的非负整数，否则 fallback。
 */
function toWindowCount(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback;

  return Math.floor(value);
}

/**
 * 生效的每页条数。
 *
 * @param pageSize 原始输入。
 * @returns 正有限数的整数部分，否则 10。
 */
export function resolvePaginationPageSize(pageSize?: number): number {
  return toPositiveCount(pageSize, PAGINATION_DEFAULT_PAGE_SIZE);
}

/**
 * 生效的总页数，下界恒为 1。
 *
 * `pageCount` 显式给出时优先，用于后端只回页数的场景；否则由 `total / pageSize`
 * 向上取整。总条数里的非有限数与负数按 0 处理，于是得到 1 页而不是 NaN 页——
 * NaN 一路传染下去会让整个页码条渲染为空，而「没有数据」在分页语境下仍然有第 1 页。
 *
 * @param config 分页配置，只读取 pageCount / total / pageSize 三项。
 * @returns 大于等于 1 的整数。
 */
export function resolvePaginationPageCount(config: PaginationConfig = {}): number {
  const { pageCount, total, pageSize } = config;

  if (typeof pageCount === 'number' && Number.isFinite(pageCount) && pageCount >= 1) {
    return Math.floor(pageCount);
  }

  const safeTotal =
    typeof total === 'number' && Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;

  return Math.max(Math.ceil(safeTotal / resolvePaginationPageSize(pageSize)), 1);
}

/**
 * 把页码夹进有效区间。
 *
 * 向下取整而不是四舍五入：第 2.6 页的语义是「第 2 页翻过去一小半」，
 * 报成第 3 页会跳到用户还没看完的数据上。
 *
 * @param page 原始页码，可能是非有限数。
 * @param pageCount 生效的总页数。
 * @returns `[1, pageCount]` 内的整数；输入不可用时为第 1 页。
 */
export function clampPaginationPage(page: number | undefined, pageCount: number): number {
  if (typeof page !== 'number' || !Number.isFinite(page)) return PAGINATION_DEFAULT_PAGE;

  return Math.min(Math.max(Math.floor(page), 1), pageCount);
}

/**
 * 生成 `[from, to]` 的连续页码项。
 *
 * `from > to` 时返回空数组，调用方因此不必为「首尾钉住 0 页」额外写分支。
 */
function pageItems(from: number, to: number): PaginationItem[] {
  const items: PaginationItem[] = [];

  for (let page = from; page <= to; page += 1) {
    items.push({ type: 'page', page, key: `page-${page}` });
  }

  return items;
}

/** 生成一个省略号项。 */
function ellipsisItem(side: PaginationEllipsisSide): PaginationItem {
  return { type: 'ellipsis', side, key: `ellipsis-${side}` };
}

/**
 * 生成页码条要渲染的项序列。
 *
 * 窗口策略是「数量恒定优先于位置精确」：中间窗口恒为 `2 × siblingCount + 1` 页，
 * 贴到首尾边界时整体平移，所以页码按钮的个数几乎不变，不会在翻页时把布局推来推去。
 *
 * 两条容易被忽略的规则：
 *
 * 1. 页数装得下就全展开。判定用的是「首尾边界 + 中间窗口 + 两个省略号位」，
 *    省略号位也算进预算——否则刚好超界时会画成「1 … 2 3 4」这种比全展开更长的样子。
 * 2. 只空出一页时不用省略号，直接补出那一页。「1 … 3」用一个字符换掉一个真页码，
 *    用户得先点开才知道第 2 页存在，是净损失。
 *
 * 返回的项只描述「画什么」，不描述「怎么画」：无障碍属性与事件都由上层向 primitives
 * 单独索取，所以同一份序列既能渲染成按钮，也能渲染成链接。
 *
 * @param config 分页配置。
 * @returns 从左到右的项序列，至少包含一项。
 */
export function getPaginationItems(config: PaginationConfig = {}): PaginationItem[] {
  const pageCount = resolvePaginationPageCount(config);
  const current = clampPaginationPage(config.current, pageCount);
  const boundary = toWindowCount(config.boundaryCount, PAGINATION_DEFAULT_BOUNDARY_COUNT);
  const sibling = toWindowCount(config.siblingCount, PAGINATION_DEFAULT_SIBLING_COUNT);

  if (pageCount <= boundary * 2 + sibling * 2 + 3) return pageItems(1, pageCount);

  // 中间窗口不得压到首尾钉住的页码上：重叠会让同一页出现两个按钮，
  // 也让 key 重复，v-for 会直接报重复键。
  const windowSize = sibling * 2 + 1;
  const first = Math.min(
    Math.max(current - sibling, boundary + 1),
    pageCount - boundary - windowSize + 1
  );
  const last = first + windowSize - 1;

  const items = pageItems(1, boundary);

  const leftGap = first - boundary - 1;

  if (leftGap >= 2) items.push(ellipsisItem('start'));
  else if (leftGap === 1) items.push(...pageItems(boundary + 1, boundary + 1));

  items.push(...pageItems(first, last));

  const rightGap = pageCount - boundary - last;

  if (rightGap >= 2) items.push(ellipsisItem('end'));
  else if (rightGap === 1) items.push(...pageItems(pageCount - boundary, pageCount - boundary));

  items.push(...pageItems(pageCount - boundary + 1, pageCount));

  return items;
}

/**
 * 前进 / 后退一步落到的页码。
 *
 * 在边界外返回 `null` 而不是回绕：分页不是轮播，「第 1 页点上一个跳到最后一页」
 * 会让用户以为数据顺序变了。调用方据此决定按钮是禁用还是执行跳转。
 *
 * 本函数不看 `disabled`——它只回答「目标页存不存在」，禁用是上层的产品判断，
 * 混进来会让「已禁用但仍在边界内」与「在边界」两种情况无法区分。
 *
 * @param config 分页配置。
 * @param direction 方向。
 * @returns 目标页码，越界时为 null。
 */
export function getPaginationStepPage(
  config: PaginationConfig = {},
  direction: PaginationDirection
): number | null {
  const pageCount = resolvePaginationPageCount(config);
  const current = clampPaginationPage(config.current, pageCount);
  const target = direction === 'previous' ? current - 1 : current + 1;

  if (target < 1 || target > pageCount) return null;

  return target;
}
