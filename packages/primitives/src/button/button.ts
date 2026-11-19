import type { ButtonAttrsInput } from './types';

/**
 * 按钮的状态属性表。
 *
 * 与 getInputAttrs / getSwitchAttrs 同一约定：状态钩子在未启用时不输出，
 * 样式层的 `[data-disabled]` / `[data-loading]` 选择器只命中真正处于该状态的按钮。
 * `aria-busy` 让读屏在加载期间播报「忙碌」，而不是把 spinner 读成内容。
 *
 * @param input 禁用与加载两个状态。
 * @returns 可直接 v-bind 的属性集合。
 */
export function getButtonAttrs(input: ButtonAttrsInput): Record<string, unknown> {
  const { disabled, loading } = input;

  return {
    'data-disabled': disabled ? '' : undefined,
    'data-loading': loading ? '' : undefined,
    'aria-busy': loading || undefined,
  };
}