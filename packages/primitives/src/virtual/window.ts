import type { VirtualFenwickTree } from './fenwick';

import { findFenwickIndex, getFenwickPrefixSum } from './fenwick';

/**
 * 可见窗口的输入：一棵建好的树加三个标量，不含任何元素引用。
 *
 * 项数刻意从 `tree.length - 1` 推导而不是另传一个 `count`：两者一旦不同步（数据变了、树还没
 * 重建），窗口就会算出越界下标；从树本身取值让这种不一致在类型层面无法表达。
 */
export interface VirtualWindowInput {
  /** 每项高度的 Fenwick 树。 */
  tree: VirtualFenwickTree;
  /** 滚动容器的 scrollTop。 */
  scrollTop: number;
  /** 可视区高度。 */
  viewportSize: number;
  /** 视口外预渲染的项数，向上向下各这么多；负数按 0 处理。 */
  overscan: number;
}

/** 可见窗口的输出，直接对应内容层需要写的那几个样式值。 */
export interface VirtualWindowResult {
  /** 首个渲染项下标，已含向前的 overscan；空列表为 0。 */
  start: number;
  /** 末个渲染项下标（含）；空列表为 -1，渲染层据此得到零个项。 */
  end: number;
  /** 内容层上内边距：`start` 之前所有项的高度之和。 */
  paddingTop: number;
  /** 内容层下内边距：`end` 之后所有项的高度之和。 */
  paddingBottom: number;
  /** 内容总高，等于 `paddingTop + 渲染项实测高 + paddingBottom` 的目标值。 */
  totalSize: number;
}

/** 一个渲染周期内的一项尺寸变化。 */
export interface VirtualResizePatch {
  /** 0-based 项下标。 */
  index: number;
  /** 相对上次测量的高度变化量，可为负。 */
  delta: number;
}

/**
 * 算出当前滚动位置该渲染哪一段，以及内容层需要补的上下内边距。
 *
 * 定位用两次树上二分（视口上沿、视口下沿）而不是「二分找首项 + 向后线性扫到视口底部」：
 * 后者在项数少时看不出来，项数大、每帧都滚时多出的正比扫描会稳定吃掉一帧预算。上下沿各
 * 一次 O(log n) 之后，中间区间是直接可枚举的渲染项，代价只跟实际渲染数有关，跟总项数无关。
 *
 * 布局走「内容层定高 + 上下 padding」而不是逐行 absolute：动态高度在测量前不可知，flow
 * 布局让行自然生长；absolute 需要为每一行再算一次偏移，等于把同一个前缀和编码两遍，
 * 还会让行内的文本选中与焦点顺序依赖定位上下文。
 *
 * 视口下沿正好落在项边界时，该项会被算进可见区（二分取 `<=`），于是底部多渲染一行。
 * 这是有意的：`scrollTop` 在小数缩放与惯性滚动下会拿到非整数值，宁可多画一行也不要
 * 在视口底部留出一条因四舍五入出现的空白。
 *
 * @param input 树、滚动位置、视口高度与预渲染项数。
 * @returns 渲染区间与内容层样式值；空列表返回零区间与零高度。
 */
export function resolveVirtualWindow(input: VirtualWindowInput): VirtualWindowResult {
  const { tree, scrollTop, viewportSize, overscan } = input;

  const count = tree.length - 1;

  if (count <= 0) {
    return { start: 0, end: -1, paddingTop: 0, paddingBottom: 0, totalSize: 0 };
  }

  const totalSize = getFenwickPrefixSum(tree, count);
  const anchor = Math.max(0, Math.min(scrollTop, totalSize));
  const leading = Math.max(0, overscan);

  const visibleStart = findFenwickIndex(tree, anchor);
  const visibleEnd = findFenwickIndex(tree, anchor + viewportSize);

  const start = Math.max(0, visibleStart - leading);
  const end = Math.min(count - 1, visibleEnd + leading);

  return {
    start,
    end,
    paddingTop: getFenwickPrefixSum(tree, start),
    paddingBottom: totalSize - getFenwickPrefixSum(tree, end + 1),
    totalSize,
  };
}

/**
 * 汇总一帧内的尺寸变化对 `scrollTop` 的影响。
 *
 * 动态高度不跳动的关键在视口**上方**：上方某项被量出真实高度后内容整体位移，用户读到的一行
 * 会在指针下突然滑走。把这一项的 delta 补回滚动位置，视口就跟没变过一样。
 *
 * 分界线是视口首项，不是渲染区间首项：两者相差一段前置 overscan，而可测量的行恰恰只有渲染
 * 区间那一段。若按渲染首项过滤，「下标小于 start」在 DOM 里根本不存在，补偿永远不会发生；
 * 按视口首项过滤，命中的正是那段「屏幕外、已渲染、刚被量过」的前置行——向上滚动进入未测量
 * 区域时，位移全部来自这里。
 *
 * 视口首项及其之下的变化不补：该项本来就压在滚动锚点上，它的长高是「正在看的内容自己变高」，
 * 用滚动位置去抵消反而会让正在阅读的那几行跳动；其下的项不影响上方高度，抵消它会把滚动推到
 * 错误位置。
 *
 * 一帧批量处理而不是每项写一次：多次 `scrollTop` 写入会在同帧里产生多次强制布局，
 * 而这一帧的目标偏移只取决于所有 delta 之和。
 *
 * @param patches 本帧测得的尺寸变化，顺序无关。
 * @param viewportStart 视口首项下标，即滚动锚点所落在的那一项（不含 overscan）。
 * @param scrollTop 变化发生时的滚动位置。
 * @returns 修正后的 `scrollTop`，不会为负；无需修正时原样返回。
 */
export function resolveScrollCorrection(
  patches: readonly VirtualResizePatch[],
  viewportStart: number,
  scrollTop: number
): number {
  let above = 0;

  for (const patch of patches) {
    if (patch.index < viewportStart) above += patch.delta;
  }

  if (above === 0) return scrollTop;

  return Math.max(0, scrollTop + above);
}
