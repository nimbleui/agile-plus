/**
 * 把高亮项滚进可视区所需的输入。
 *
 * 全部是标量，由适配层在一个读取阶段量好传进来：本层不碰 DOM，因此同一份输入永远
 * 得到同一份输出，可以在 node 环境直接断言滚动边界。
 */
export interface SelectScrollInput {
  /** 视口当前的 scrollTop */
  scrollTop: number;
  /** 高亮项上边相对视口上边的距离，可为负（已被滚到视口上方） */
  itemOffset: number;
  /** 高亮项的高度 */
  itemSize: number;
  /** 视口的可视高度 */
  viewportSize: number;
}

/**
 * 算出「让高亮项完整可见」所需的最小 scrollTop。
 *
 * 用最小位移而不是 `scrollIntoView`：后者会连带滚动所有可滚动祖先，浮层被 portal 到
 * body 时会把整个页面也滚一段，看起来像下拉打开时页面自己跳了一下。这里只动视口自己
 * 的 scrollTop，且已经完整可见时返回原值，不做无意义的写入。
 *
 * 上方被裁时对齐到项的上边，下方被裁时对齐到项的下边——都只补差额，因此连续按方向键
 * 时列表是逐项跟着走，而不是每次翻页。
 *
 * @param input 视口滚动位置与高亮项的相对几何。
 * @returns 新的 scrollTop；不会为负。
 */
export function resolveScrollTop(input: SelectScrollInput): number {
  const { scrollTop, itemOffset, itemSize, viewportSize } = input;

  if (itemOffset < 0) return Math.max(0, scrollTop + itemOffset);

  const overflow = itemOffset + itemSize - viewportSize;

  if (overflow > 0) return scrollTop + overflow;

  return scrollTop;
}
