import { ROVING_FOCUS_KEY_MAP } from './types';

import type {
  ToggleGroupDirection,
  ToggleRovingFocusInput,
  ToggleRovingFocusIntent,
  ToggleRovingFocusTargetInput,
} from './types';

/**
 * RTL 下互换左右方向键。
 *
 * 只互换 Left/Right：视觉上「往后退」在 RTL 布局里是向左，键盘用户的直觉跟着视觉
 * 顺序走，而不是跟着物理键位。上下键与阅读方向无关，保持原样。
 *
 * @param key 原始 `KeyboardEvent.key`。
 * @param dir 文本方向。
 * @returns 方向感知后的键名。
 */
export function resolveDirectionAwareKey(key: string, dir: ToggleGroupDirection): string {
  if (dir !== 'rtl') return key;

  return key === 'ArrowLeft' ? 'ArrowRight' : key === 'ArrowRight' ? 'ArrowLeft' : key;
}

/**
 * 把按键解析成焦点意图。
 *
 * 三条不接管的情况，与 Radix 的 getFocusIntent 一致：
 *
 * 1. 带 Shift/Ctrl/Alt/Meta 的按键留给浏览器（例如 Ctrl+Home 滚到文档开头）。
 * 2. 纵向组忽略左右键、横向组忽略上下键，避免与页面滚动抢按键。
 * 3. 未提供 orientation 时四个方向都接管，这与 RadioGroup 的处理相同。
 *
 * @param input 按键、组方向、文本方向与修饰键状态。
 * @returns 焦点意图；返回 null 表示这个按键不该被接管。
 */
export function resolveRovingFocusIntent(
  input: ToggleRovingFocusInput
): ToggleRovingFocusIntent | null {
  const { key, orientation, dir, hasModifierKey } = input;

  if (hasModifierKey) return null;

  const directionAwareKey = resolveDirectionAwareKey(key, dir);

  const isCrossAxis =
    (orientation === 'vertical' && ['ArrowLeft', 'ArrowRight'].includes(directionAwareKey)) ||
    (orientation === 'horizontal' && ['ArrowUp', 'ArrowDown'].includes(directionAwareKey));

  if (isCrossAxis) return null;

  return ROVING_FOCUS_KEY_MAP[directionAwareKey] ?? null;
}

/**
 * 计算要聚焦的目标项下标。
 *
 * 结果与 Radix 的实现等价，但把它写成「算出一个下标」而不是「生成候选数组再挨个
 * try」：Radix 需要候选列表是因为它的 focusFirst 会跳过真正无法聚焦的元素，而罗盘
 * 焦点的候选已经按 focusable 过滤过，下标本身就是唯一答案。
 *
 * 焦点不在可聚焦列表内（currentIndex 为 -1，例如项刚被禁用）时，Radix 的
 * `indexOf` 也返回 -1 并从列表头开始尝试，因此 next 落到第一项、prev 落到最后一项，
 * 与 loop 无关——这个分支要单独处理，直接套模运算会得到错误结果。
 *
 * @param input 意图、当前下标、可聚焦数量与是否绕回。
 * @returns 目标下标；null 表示不移动焦点（此时调用方仍应 preventDefault，与 Radix 一致）。
 */
export function resolveRovingFocusTargetIndex(input: ToggleRovingFocusTargetInput): number | null {
  const { intent, currentIndex, count, loop } = input;

  if (count === 0) return null;

  if (intent === 'first') return 0;
  if (intent === 'last') return count - 1;

  if (currentIndex < 0) return intent === 'prev' ? count - 1 : 0;

  const target = intent === 'prev' ? currentIndex - 1 : currentIndex + 1;

  if (target < 0 || target > count - 1) {
    return loop ? (target + count) % count : null;
  }

  return target;
}
