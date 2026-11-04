import type { RadioGroupKeyboardContext, RadioGroupKeyboardResult } from './types';

/** 前进方向键：radio group 与原生行为一致，上下左右四个方向均可导航，与视觉排布无关。 */
const ADVANCE_KEYS = ['ArrowDown', 'ArrowRight'];

/** 后退方向键。 */
const RETREAT_KEYS = ['ArrowUp', 'ArrowLeft'];

/**
 * 计算 RadioGroup 方向键的下一个目标值。
 *
 * 该函数保持纯计算：输入已过滤的可用值列表，输出目标 value 与是否需要
 * preventDefault，便于脱离 DOM 独立单元测试。
 *
 * @param key 按下的键名（KeyboardEvent.key）。
 * @param context 导航上下文，包含可用值列表与当前焦点值。
 * @returns 下一个需要聚焦并选中的值，以及该按键是否已被处理。
 */
export function handleRadioGroupKeydown(
  key: string,
  context: RadioGroupKeyboardContext
): RadioGroupKeyboardResult {
  const { enabledValues, focusedValue, loop = true } = context;

  const none: RadioGroupKeyboardResult = { nextValue: null, handled: false };

  if (enabledValues.length === 0) return none;

  const currentIndex = enabledValues.indexOf(focusedValue ?? '');

  if (key === 'Home') {
    return { nextValue: enabledValues[0], handled: true };
  }

  if (key === 'End') {
    return { nextValue: enabledValues[enabledValues.length - 1], handled: true };
  }

  const isAdvance = ADVANCE_KEYS.includes(key);
  const isRetreat = RETREAT_KEYS.includes(key);

  if (!isAdvance && !isRetreat) return none;

  // 焦点不在可用列表中（例如整组禁用后聚焦了禁用项）时，前进取首项、后退取末项。
  if (currentIndex === -1) {
    return {
      nextValue: isAdvance ? enabledValues[0] : enabledValues[enabledValues.length - 1],
      handled: true,
    };
  }

  const step = isAdvance ? 1 : -1;
  const rawIndex = currentIndex + step;

  if (rawIndex < 0) {
    return loop ? { nextValue: enabledValues[enabledValues.length - 1], handled: true } : none;
  }

  if (rawIndex > enabledValues.length - 1) {
    return loop ? { nextValue: enabledValues[0], handled: true } : none;
  }

  return { nextValue: enabledValues[rawIndex], handled: true };
}
