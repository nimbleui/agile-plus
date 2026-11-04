/**
 * 单个开关的状态转换。
 *
 * Radix 的 Toggle 在点击处理器里判 disabled：真正 disabled 的原生 button 不会派发
 * click，这层判断是给「用 asChild 换成非 button 元素」的用法兜底的，因此保留。
 *
 * @param input pressed 当前按下状态；disabled 是否禁用。
 * @returns 下一个按下状态；禁用时返回 null 表示状态不变。
 */
export function resolveNextTogglePressed(input: {
  pressed: boolean;
  disabled: boolean;
}): boolean | null {
  if (input.disabled) return null;

  return !input.pressed;
}

/**
 * 开关的 `data-state` 词表。
 *
 * Radix 用 `on` / `off` 而不是 `open` / `closed`，样式层的选择器必须跟着这个词表。
 *
 * @param pressed 是否按下。
 * @returns 写入 data-state 的字符串。
 */
export function getToggleDataState(pressed: boolean): 'on' | 'off' {
  return pressed ? 'on' : 'off';
}
