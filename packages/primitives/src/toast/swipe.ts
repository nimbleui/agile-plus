import { TOAST_SWIPE_START_BUFFER_POINTER, TOAST_SWIPE_START_BUFFER_TOUCH } from './types';

import type {
  ToastPoint,
  ToastSwipeDirection,
  ToastSwipeEndPhase,
  ToastSwipeMoveInput,
  ToastSwipeMoveResult,
} from './types';

/**
 * 只允许手势轴方向上的位移通过，另一轴归零。
 *
 * `left`/`up` 用 `Math.min`、`right`/`down` 用 `Math.max`，效果是把反方向位移压到 0：
 * 右滑手势中往左拖不会让通知朝反方向飞出去，但也不会立刻取消手势（取消由
 * {@link resolveSwipeMove} 的 `reset` 阶段处理）。
 *
 * @param delta 原始位移。
 * @param direction 手势方向。
 * @returns 钳制后的位移，供 CSS 变量与阈值判定使用。
 */
export function clampSwipeDelta(delta: ToastPoint, direction: ToastSwipeDirection): ToastPoint {
  const isHorizontal = direction === 'left' || direction === 'right';
  const clamp = direction === 'left' || direction === 'up' ? Math.min : Math.max;

  return {
    x: isHorizontal ? clamp(0, delta.x) : 0,
    y: isHorizontal ? 0 : clamp(0, delta.y),
  };
}

/**
 * 判断位移是否落在手势方向上并且超过阈值。
 *
 * 判定只看主轴：横向手势要求水平位移严格大于垂直位移，否则视为用户在竖向滑动、
 * 不该关闭通知。主轴位移必须**严格大于** threshold，等于阈值不算越界。
 *
 * @param delta 位移量。
 * @param direction 手势方向。
 * @param threshold 判定所需的最小主轴位移，单位像素。
 * @returns 位移是否构成一次有效手势。
 */
export function isDeltaInDirection(
  delta: ToastPoint,
  direction: ToastSwipeDirection,
  threshold = 0
): boolean {
  const deltaX = Math.abs(delta.x);
  const deltaY = Math.abs(delta.y);
  const isDeltaX = deltaX > deltaY;

  if (direction === 'left' || direction === 'right') {
    return isDeltaX && deltaX > threshold;
  }

  return !isDeltaX && deltaY > threshold;
}

/**
 * 判定一帧指针位移对应手势的哪个阶段。
 *
 * 手势启动阈值触摸为 10px、鼠标为 2px：手指按下时的抖动会远超鼠标微动，
 * 用同一阈值会让「点一下按钮」被识别成滑动。启动判定用的是钳制后的位移，
 * 因此反方向位移永远无法启动手势；而是否放弃手势看原始位移，两者不可互换。
 *
 * @param input 本帧位移、方向、指针类型与是否已启动。
 * @returns 阶段与钳制位移；`idle` 表示调用方应保持现状。
 */
export function resolveSwipeMove(input: ToastSwipeMoveInput): ToastSwipeMoveResult {
  const { delta, direction, pointerType, started } = input;
  const buffer =
    pointerType === 'touch' ? TOAST_SWIPE_START_BUFFER_TOUCH : TOAST_SWIPE_START_BUFFER_POINTER;
  const clamped = clampSwipeDelta(delta, direction);

  if (started) {
    return { phase: 'move', clamped };
  }

  if (isDeltaInDirection(clamped, direction, buffer)) {
    return { phase: 'start', clamped };
  }

  if (Math.abs(delta.x) > buffer || Math.abs(delta.y) > buffer) {
    return { phase: 'reset', clamped };
  }

  return { phase: 'idle', clamped };
}

/**
 * 指针抬起时决定关闭还是回弹。
 *
 * 位移取自钳制值，因此「先右滑 80px 再拉回 20px」的抬手判定仍是 `end`——
 * 这与 Radix 一致：手势一旦被确认就用它的累计位移做结论。
 *
 * @param delta 钳制后的累计位移。
 * @param direction 手势方向。
 * @param threshold 关闭所需的最小主轴位移。
 * @returns `end` 表示关闭，`cancel` 表示回弹留在原位。
 */
export function getSwipeEndPhase(
  delta: ToastPoint,
  direction: ToastSwipeDirection,
  threshold: number
): ToastSwipeEndPhase {
  return isDeltaInDirection(delta, direction, threshold) ? 'end' : 'cancel';
}
