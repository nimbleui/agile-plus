import { clampPaginationPage, getPaginationStepPage, resolvePaginationPageCount } from './items';

import type { PaginationConfig, PaginationDataState, PaginationDirection } from './types';

/**
 * 页码件是否为当前页。
 *
 * 比较的是**夹取后**的当前页：外部传进 99 而总页数只有 5 时，页面上被点亮的仍然是
 * 第 5 页，`aria-current` 也必须落在第 5 页上，否则读屏播报与视觉指向两个不同的页。
 *
 * @param page 待判定的页码。
 * @param config 分页配置。
 * @returns 是否命中当前页。
 */
export function isPaginationCurrentPage(page: number, config: PaginationConfig = {}): boolean {
  return page === clampPaginationPage(config.current, resolvePaginationPageCount(config));
}

/**
 * 页码件的 `data-state`。
 *
 * @param page 该件代表的页码。
 * @param config 分页配置。
 * @returns `'active'` 或 `'inactive'`。
 */
export function getPaginationPageState(
  page: number,
  config: PaginationConfig = {}
): PaginationDataState {
  return isPaginationCurrentPage(page, config) ? 'active' : 'inactive';
}

/**
 * 页码按钮的属性表。
 *
 * `aria-current="page"` 是 APG 分页模式里「这是当前页」的唯一权威表达，同时它在
 * 多数浏览器与辅助技术里有默认视觉强调，因此这里同时给出 `data-state`：样式层按
 * 词表写选择器，不依赖 `[aria-current]`，这样无障碍语义与视觉实现互不绑架。
 *
 * 非当前页**不输出** `aria-current` 而不是输出 `"false"`：该属性只有出现在 DOM 上
 * 才有含义，写 `aria-current="false"` 会让读屏把每一项都播报成「非当前页」。
 *
 * @param page 该件代表的页码。
 * @param config 分页配置。
 * @returns 可直接 v-bind 的属性集合。
 */
export function getPaginationPageAttrs(
  page: number,
  config: PaginationConfig = {}
): Record<string, unknown> {
  const isCurrent = isPaginationCurrentPage(page, config);

  return {
    'aria-current': isCurrent ? 'page' : undefined,
    'data-state': isCurrent ? 'active' : 'inactive',
  };
}

/**
 * 前进 / 后退按钮的属性表。
 *
 * 两种「按不动」合成一个状态：显式 `disabled`，以及已经站在首尾页上。对用户是同一件
 * 事（这一步走不了），对读屏也必须给出同一个结论，否则第 1 页上的「上一页」会被播报成
 * 一个可用的按钮。
 *
 * 除了原生 `disabled` 还写 `data-disabled`，与 Switch / Collapsible 同一约定：样式层
 * 按「属性存在」命中，未禁用时**不输出**而不是输出 false。原生 disabled 会让按钮
 * 退出 Tab 序列，这是分页里可接受的行为——页码本身仍逐个可达，键盘用户不会因为
 * 「上一页」消失而迷路。
 *
 * @param direction 方向。
 * @param config 分页配置。
 * @returns 可直接 v-bind 的属性集合。
 */
export function getPaginationStepAttrs(
  direction: PaginationDirection,
  config: PaginationConfig = {}
): Record<string, unknown> {
  const blocked = config.disabled === true || getPaginationStepPage(config, direction) === null;

  return {
    disabled: blocked ? true : undefined,
    'data-disabled': blocked ? '' : undefined,
  };
}

/**
 * 整条禁用时页码件的属性表。
 *
 * @param config 分页配置。
 * @returns 无属性，或 `disabled` + `data-disabled`。
 */
export function getPaginationItemAttrs(config: PaginationConfig = {}): Record<string, unknown> {
  const disabled = config.disabled === true;

  return {
    disabled: disabled ? true : undefined,
    'data-disabled': disabled ? '' : undefined,
  };
}
