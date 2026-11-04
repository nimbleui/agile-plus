import type { ThumbDragInput, ThumbMetrics, ThumbMetricsInput } from './types';

/**
 * thumb 的最小可点中长度（px）。
 *
 * 内容远大于视口时按比例算出的 thumb 会细到 1px 以下，指针无法点中，
 * 因此必须钳制下限；代价是此时 thumb 位置与滚动比例的映射不再线性。
 */
export const DEFAULT_MIN_THUMB_SIZE = 20;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;

  if (value > max) return max;

  return value;
}

/**
 * 计算 thumb 在该朝向下应有的长度与轨道内偏移。
 *
 * 长度按「可视占比」缩放，偏移按滚动比例映射到剩余可用轨道。取整是为了直接写进
 * 内联 style 时不出现亚像素抖动；偏移与反算共用同一份取整结果，因此拖拽不会跳位。
 *
 * @param input 同一朝向下的像素快照。
 * @returns thumb 尺寸、偏移与是否溢出。
 */
export function getThumbMetrics(input: ThumbMetricsInput): ThumbMetrics {
  const { viewportSize, scrollSize, scrollOffset, minThumbSize = DEFAULT_MIN_THUMB_SIZE } = input;

  if (viewportSize <= 0 || scrollSize <= viewportSize) {
    return { size: 0, offset: 0, hasOverflow: false };
  }

  const proportionalSize = (viewportSize / scrollSize) * viewportSize;
  const size = Math.max(minThumbSize, proportionalSize);
  const usableTrack = Math.max(0, viewportSize - size);
  const scrollableRange = scrollSize - viewportSize;
  const scrollRatio = clamp(scrollOffset / scrollableRange, 0, 1);

  return {
    size: Math.round(size),
    offset: Math.round(scrollRatio * usableTrack),
    hasOverflow: true,
  };
}

/**
 * 把拖拽得到的 thumb 偏移钳制在轨道内。
 *
 * 指针可以移到滚动条之外，偏移必须先落在 `[0, 轨道 - thumb]` 内再反算滚动位置，
 * 否则越界的比例会让 `scrollTop` 被反复写到极值、产生抖动。
 *
 * @param rawOffset 未钳制的目标偏移（起点加指针位移）。
 * @param viewportSize 轨道长度。
 * @param thumbSize thumb 长度。
 * @returns 落在轨道内的偏移；轨道不足时返回 0。
 */
export function clampThumbOffset(
  rawOffset: number,
  viewportSize: number,
  thumbSize: number
): number {
  const usableTrack = Math.max(0, viewportSize - thumbSize);

  return clamp(rawOffset, 0, usableTrack);
}

/**
 * 由 thumb 在轨道内的偏移反算滚动偏移，用于拖拽。
 *
 * @param input 与正算一致的轨道、内容尺寸与当前 thumb 长度。
 * @returns 目标滚动偏移，无溢出或轨道无剩余空间时为 0。
 */
export function getScrollOffsetFromThumb(input: ThumbDragInput): number {
  const { thumbOffset, viewportSize, scrollSize, thumbSize } = input;

  const scrollableRange = scrollSize - viewportSize;

  if (scrollableRange <= 0) return 0;

  const usableTrack = Math.max(0, viewportSize - thumbSize);

  // 内容几乎填满轨道时没有可映射的余量，此时拖拽不应产生滚动。
  if (usableTrack === 0) return 0;

  const thumbRatio = clamp(thumbOffset / usableTrack, 0, 1);

  return Math.round(thumbRatio * scrollableRange);
}
