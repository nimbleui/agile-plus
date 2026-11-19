import type { InputAttrsInput } from './types';

/**
 * 输入控件（input / textarea）的状态属性表。
 *
 * 与 getSwitchAttrs 同一约定：`data-disabled` / `data-readonly` 在未启用时**不输出**
 * 而不是输出 false——样式层按「属性存在」写选择器，把 false 写成属性会让
 * `[data-disabled]` 命中所有输入框。`aria-required` 同理。
 *
 * 原生 `disabled` / `readonly` / `required` 属性由 headless 层随属性表一起给出，
 * 这里只负责状态钩子与 ARIA，不重复声明原生属性。
 *
 * @param input 禁用、只读、必填三个状态。
 * @returns 可直接 v-bind 的属性集合。
 */
export function getInputAttrs(input: InputAttrsInput): Record<string, unknown> {
  const { disabled, readOnly, required } = input;

  return {
    'data-disabled': disabled ? '' : undefined,
    'data-readonly': readOnly ? '' : undefined,
    'aria-required': required || undefined,
  };
}