import type { ToggleGroupType, ToggleGroupValueInput } from './types';

/**
 * 把对外暴露的值形状规范化成内部数组。
 *
 * 组内部统一用数组，single 只是「数组长度不超过 1」的特例：这样项的选中判定、
 * 增删逻辑只有一套，序列化只在出口处发生一次。
 *
 * @param type 组类型。
 * @param value 外部传入的值：single 是字符串，multiple 是数组，null/undefined 视为未选。
 * @returns 内部值集合。
 */
export function normalizeToggleGroupValue(
  type: ToggleGroupType,
  value: string | string[] | null | undefined
): string[] {
  if (value === null || value === undefined) return [];

  if (type === 'single') return value === '' ? [] : [String(value)];

  return Array.isArray(value) ? value : [];
}

/**
 * 判断某一项是否处于选中状态。
 *
 * @param value 当前组值集合。
 * @param itemValue 项的值。
 * @returns 该项是否按下。
 */
export function isToggleGroupItemPressed(value: string[], itemValue: string): boolean {
  return value.includes(itemValue);
}

/**
 * 计算一次项点击后的组值集合。
 *
 * 语义与 Radix 一致：single 选中某项时**替换**整个值，取消时变空集合（单选组允许
 * 一项都不选，这是它和 RadioGroup 的关键区别）；multiple 选中时追加、取消时移除。
 *
 * @param input 组类型、变化前的值、项的值与该项的新状态。
 * @returns 变化后的值集合。
 */
export function resolveGroupValueAfterToggle(input: ToggleGroupValueInput): string[] {
  const { type, value, itemValue, pressed } = input;

  if (type === 'single') return pressed ? [itemValue] : [];

  return pressed ? [...value, itemValue] : value.filter((item) => item !== itemValue);
}

/**
 * 把内部数组还原成对外事件的负载形状。
 *
 * single 的空集合要序列化成 `''`：Radix 的 `onValueChange(string)` 与受控
 * `value?: string` 都以空字符串表达「没有选中」，直接给 undefined 会让受控用法
 * 被判定为「未受控」而切换模式。
 *
 * @param type 组类型。
 * @param value 内部值集合。
 * @returns 对外暴露的值。
 */
export function serializeToggleGroupValue(
  type: ToggleGroupType,
  value: string[]
): string | string[] {
  if (type === 'single') return value[0] ?? '';

  return value;
}
