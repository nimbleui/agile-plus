import type { ScrollAreaType, ScrollbarVisibility, ScrollbarVisibilityInput } from './types';

/**
 * 判定滚动条与 thumb 的可见性。
 *
 * 规则按 Radix 的 `type` 语义组合，读作一条链：
 * `always` 常驻；否则必须先有溢出，再在「拖拽中」或「该类型自己的触发条件」上放行。
 *
 * @param input 已归一化的四个布尔输入。
 * @param type 滚动出现时机。
 * @returns 对应 data-state 的取值。
 */
export function resolveScrollbarVisibility(
  input: ScrollbarVisibilityInput,
  type: ScrollAreaType
): ScrollbarVisibility {
  const { interacting, dragging, recentlyScrolled, hasOverflow } = input;

  const typeAllowsVisible =
    type === 'always' ||
    type === 'auto' ||
    (type === 'hover' && interacting) ||
    (type === 'scroll' && recentlyScrolled);

  // always 的语义是「轨道常驻」，即使内容没有溢出：此时 thumb 长度为 0，自然不可见。
  const visible = type === 'always' || (hasOverflow && (dragging || typeAllowsVisible));

  return visible ? 'visible' : 'hidden';
}
