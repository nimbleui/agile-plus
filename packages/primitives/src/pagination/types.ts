/**
 * Pagination 的类型与常量。
 *
 * 对齐对象是企业级组件库里「页码条」这一件事的共同形状：总量换算页数、当前页开窗、
 * 首尾钉住页码、中间用省略号压缩。本层只回答「该画哪几页」，不持有状态、不碰 DOM，
 * 状态归 headless 的 usePagination，结构归 ui 层的六个部件。
 */

/**
 * 省略号的方位。
 *
 * 同一个页码条里最多出现两个省略号，`side` 既是样式层的区分钩子，也是列表渲染时
 * 省略号唯一键的来源——用索引当键会在窗口滑动时让两个省略号互相错位。
 */
export type PaginationEllipsisSide = 'start' | 'end';

/**
 * 前进 / 后退方向。
 *
 * 词表取自 ARIA 的 `rel` 与 APG 分页模式里的 `Previous` / `Next`，不用 `'prev'`：
 * 缩写会在公共 API 里永久留下一个需要解释的名字。
 */
export type PaginationDirection = 'previous' | 'next';

/**
 * 页码件的 `data-state` 词表。
 *
 * 与 Tabs 的 `aria-selected`、Switch 的 `checked` 都不同：页码不是被选中的面板，
 * 而是「当前这一页」，APG 用 `aria-current="page"` 表达同一件事。这里把两套词表都
 * 输出——aria 给读屏，data-state 给样式层，因为属性选择器 `[aria-current='page']`
 * 会把无障碍语义写进视觉实现里。
 */
export type PaginationDataState = 'active' | 'inactive';

/**
 * 页码条上的一个可渲染项。
 *
 * `key` 是稳定标识：页码项用页码本身，省略号项用方位。消费者 `v-for` 时直接取它，
 * 不需要再自己拼一个——两套人各拼一遍正是键漂移的起点。
 */
export type PaginationItem =
  | { type: 'page'; page: number; key: string }
  | { type: 'ellipsis'; side: PaginationEllipsisSide; key: string };

/**
 * Pagination 的属性集合。
 *
 * 这份配置在 ui 层由 Root 一次性构造并向下提供，部件不各自持有配置副本，
 * 否则「同一份 total 在两个部件里算出两个 pageCount」就是必然发生的事故。
 */
export interface PaginationConfig {
  /**
   * 数据总条数。
   *
   * 与 `pageCount` 二选一：`pageCount` 存在时本项不参与换算。
   * 非有限数与负数按 0 处理，即「只有第 1 页」。
   *
   * @default 0
   */
  total?: number;

  /**
   * 每页条数；非正有限数回退到 10。
   *
   * @default 10
   */
  pageSize?: number;

  /**
   * 直接指定总页数，用于后端只回页数、不回条数的场景。
   *
   * 只有 ≥ 1 的有限数生效，其余情况（含 0）退回 `total / pageSize` 换算：
   * 0 页的页码条画不出任何一个可点项，也会让当前页夹取无意义，因此本库保证
   * 页数下界恒为 1。
   *
   * @default undefined
   */
  pageCount?: number;

  /**
   * 当前页，从 1 开始。
   *
   * 参与计算前一律夹取到 `[1, 页数]`：越界值来自外部数据（低代码平台的属性表、
   * 接口返回的分页元信息），画出一个越界页码会让 `aria-current` 指向不存在的页。
   *
   * @default 1
   */
  current?: number;

  /**
   * 当前页左右各保留几个页码；负数与非有限数回退到 1。
   *
   * `0` 是有效档位，表示中间只留当前页；小数向下取整。
   *
   * @default 1
   */
  siblingCount?: number;

  /**
   * 首尾各钉住几个页码；负数与非有限数回退到 1。
   *
   * `0` 是有效档位，表示首尾都不钉，此时该端的省略号直接落在页码条末端。
   *
   * @default 1
   */
  boundaryCount?: number;

  /**
   * 整条禁用：所有页码与前进后退都不可点。
   *
   * @default false
   */
  disabled?: boolean;
}
