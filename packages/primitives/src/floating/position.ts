import {
  DEFAULT_PLACEMENT,
  computeBaseCoords,
  formatPlacement,
  getBoundaryRect,
  getCrossOverflow,
  getOverflow,
  getSideOverflow,
  isVerticalMainAxis,
  normalizeOffset,
  oppositeAlign,
  oppositeSide,
  parsePlacement,
} from './geometry';

import type {
  FloatingAlign,
  FloatingArrowOptions,
  FloatingArrowPosition,
  FloatingAvailableSpace,
  FloatingOptions,
  FloatingPlacement,
  FloatingRect,
  FloatingResult,
  FloatingSide,
  FloatingSnapshot,
} from './types';

function rectAt(coords: { x: number; y: number }, floating: FloatingRect): FloatingRect {
  return { x: coords.x, y: coords.y, width: floating.width, height: floating.height };
}

/**
 * 决定实际采用的位置：先试对边翻转，再试对立对齐翻转。
 *
 * 判据是「翻转后溢出更小」而不是「翻转后不溢出」：两侧都放不下时（浮层比视口还高）
 * 仍应选溢出较少的一侧，否则会在空间不足时保持一个更差的位置。
 * 对齐只在非 center 时尝试——center 没有对立态。
 */
export function resolvePlacement(
  snapshot: FloatingSnapshot,
  options: FloatingOptions = {}
): FloatingPlacement {
  const padding = options.padding ?? 0;
  const offset = normalizeOffset(options.offset);
  const boundary = getBoundaryRect(snapshot);
  const { side, align } = parsePlacement(options.placement ?? DEFAULT_PLACEMENT);

  const overflowFor = (nextSide: FloatingSide, nextAlign: FloatingAlign) =>
    getOverflow(
      rectAt(computeBaseCoords(snapshot, nextSide, nextAlign, offset), snapshot.floating),
      boundary,
      padding
    );

  let resolvedSide = side;
  let resolvedAlign = align;

  if (options.flip ?? true) {
    const currentOverflow = getSideOverflow(overflowFor(side, align), side);

    if (currentOverflow > 0) {
      const flippedSide = oppositeSide(side);

      if (getSideOverflow(overflowFor(flippedSide, align), flippedSide) < currentOverflow) {
        resolvedSide = flippedSide;
      }
    }

    if (align !== 'center') {
      const currentCross = getCrossOverflow(overflowFor(resolvedSide, align), resolvedSide);

      if (currentCross > 0) {
        const flippedAlign = oppositeAlign(align);

        if (
          getCrossOverflow(overflowFor(resolvedSide, flippedAlign), resolvedSide) < currentCross
        ) {
          resolvedAlign = flippedAlign;
        }
      }
    }
  }

  return formatPlacement(resolvedSide, resolvedAlign);
}

/**
 * 单轴钳制。
 *
 * 可用区间为空（浮层比边界还大）时贴起始边而不是居中：居中会让两侧同时被裁，
 * 贴边至少保证起始侧的内容完整可读。
 */
function clampAxis(value: number, min: number, max: number): number {
  if (max < min) return min;

  return Math.min(Math.max(value, min), max);
}

/**
 * 沿**交叉轴**把浮层钳回边界内。
 *
 * 刻意不动主轴：主轴一旦钳制，浮层与锚点之间的间距就会被压掉甚至重叠，
 * 看起来像贴错了元素。交叉轴钳制只让它沿锚点边滑动，指向关系保持不变。
 */
export function shiftCoords(
  coords: { x: number; y: number },
  snapshot: FloatingSnapshot,
  side: FloatingSide,
  padding: number
): { x: number; y: number } {
  const boundary = getBoundaryRect(snapshot);
  const { floating } = snapshot;

  if (isVerticalMainAxis(side)) {
    return {
      x: clampAxis(
        coords.x,
        boundary.x + padding,
        boundary.x + boundary.width - padding - floating.width
      ),
      y: coords.y,
    };
  }

  return {
    x: coords.x,
    y: clampAxis(
      coords.y,
      boundary.y + padding,
      boundary.y + boundary.height - padding - floating.height
    ),
  };
}

/**
 * 算出箭头在浮层自身坐标系里的中心偏移，让它对准锚点中心。
 *
 * 必须用**钳制之后**的坐标：浮层被 shift 推走后，箭头若仍按原坐标算就会指偏。
 * 箭头比浮层还宽时两端留白无解，退化为居中，至少不会算出负偏移。
 */
export function computeArrowPosition(
  snapshot: FloatingSnapshot,
  coords: { x: number; y: number },
  placement: FloatingPlacement,
  arrow: FloatingArrowOptions
): FloatingArrowPosition {
  const { side } = parsePlacement(placement);
  const vertical = isVerticalMainAxis(side);
  const padding = arrow.padding ?? 0;
  const { reference, floating } = snapshot;

  const referenceCenter = vertical
    ? reference.x + reference.width / 2
    : reference.y + reference.height / 2;
  const origin = vertical ? coords.x : coords.y;
  const extent = vertical ? floating.width : floating.height;
  const min = padding;
  const max = extent - arrow.size - padding;
  const centered = referenceCenter - origin - arrow.size / 2;
  const offset = max < min ? Math.max(0, (extent - arrow.size) / 2) : clampAxis(centered, min, max);

  return vertical ? { x: offset, y: null } : { x: null, y: offset };
}

/**
 * 算出实际所在边一侧还剩多少可用空间。
 *
 * 与 {@link computeFloatingPosition} 共用同一份快照，因此调用方不必为了「限制浮层
 * 最大高度」再量一次 DOM：定位与可用空间来自同一次测量，滚动跟随时不会出现两者
 * 差一帧的错位。
 *
 * 主轴方向扣掉锚点自身、offset 与 padding；交叉轴方向只扣 padding——浮层沿交叉轴
 * 可以占满整条边界。结果为负时钳到 0，表示这一侧已经放不下任何内容。
 *
 * @param snapshot 与定位同一份几何快照。
 * @param placement **实际采用**的位置（翻转之后的），不是请求的位置。
 * @param options 与定位同一份配置，offset / padding 必须一致否则算出的空间对不上。
 * @returns 该侧可用的宽高，单位与快照一致。
 */
export function computeAvailableSpace(
  snapshot: FloatingSnapshot,
  placement: FloatingPlacement,
  options: FloatingOptions = {}
): FloatingAvailableSpace {
  const padding = options.padding ?? 0;
  const { mainAxis } = normalizeOffset(options.offset);
  const boundary = getBoundaryRect(snapshot);
  const { side } = parsePlacement(placement);
  const { reference } = snapshot;

  const left = boundary.x + padding;
  const top = boundary.y + padding;
  const right = boundary.x + boundary.width - padding;
  const bottom = boundary.y + boundary.height - padding;

  if (side === 'top') {
    return { width: Math.max(0, right - left), height: Math.max(0, reference.y - mainAxis - top) };
  }

  if (side === 'bottom') {
    return {
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - reference.y - reference.height - mainAxis),
    };
  }

  if (side === 'left') {
    return { width: Math.max(0, reference.x - mainAxis - left), height: Math.max(0, bottom - top) };
  }

  return {
    width: Math.max(0, right - reference.x - reference.width - mainAxis),
    height: Math.max(0, bottom - top),
  };
}

/**
 * 一次完整定位：翻转 → 基础坐标 → 交叉轴钳制 → 箭头。
 *
 * 顺序是契约的一部分：翻转必须先于坐标，否则钳制会基于错误的一侧；箭头必须后于钳制，
 * 否则被推走的浮层上箭头会指偏。整个函数不读 DOM，输入快照决定输出。
 */
export function computeFloatingPosition(
  snapshot: FloatingSnapshot,
  options: FloatingOptions = {}
): FloatingResult {
  const placement = resolvePlacement(snapshot, options);
  const { side, align } = parsePlacement(placement);
  const base = computeBaseCoords(snapshot, side, align, normalizeOffset(options.offset));
  const coords =
    (options.shift ?? true) ? shiftCoords(base, snapshot, side, options.padding ?? 0) : base;

  return {
    x: coords.x,
    y: coords.y,
    placement,
    arrow: options.arrow ? computeArrowPosition(snapshot, coords, placement, options.arrow) : null,
  };
}
