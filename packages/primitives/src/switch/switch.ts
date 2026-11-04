import type { SwitchAttrsInput, SwitchDataState } from './types';

/**
 * 开关的 `data-state` 取值。
 *
 * @param checked 是否打开。
 * @returns 写入 data-state 的字符串。
 */
export function getSwitchDataState(checked: boolean): SwitchDataState {
  return checked ? 'checked' : 'unchecked';
}

/**
 * 开关根元素的 ARIA 与状态属性表。
 *
 * `aria-required` 与 `data-disabled` 在未启用时**不输出**而不是输出 false：Radix
 * 依赖这个约定，样式层也按「属性存在」写选择器；把 false 写成属性会让
 * `[data-disabled]` 这类选择器命中所有开关。
 *
 * @param input 选中、禁用、必填三个状态。
 * @returns 可直接 v-bind 的属性集合。
 */
export function getSwitchAttrs(input: SwitchAttrsInput): Record<string, unknown> {
  const { checked, disabled, required } = input;

  return {
    role: 'switch',
    'aria-checked': checked,
    'aria-required': required || undefined,
    'data-state': getSwitchDataState(checked),
    'data-disabled': disabled ? '' : undefined,
  };
}
