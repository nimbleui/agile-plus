import type {
  AccordionItemAttrsInput,
  AccordionRootAttrsInput,
  AccordionType,
  AccordionValueInput,
} from './types';

/**
 * 把对外暴露的值形状规范化成内部数组。
 *
 * 组内部统一用数组，single 只是「长度不超过 1」的特例：项的展开判定与增删只有一套，
 * 序列化只在出口发生一次。归一化必须在受控判定之后做——直接返回 `[]` 会让「未传 value」
 * 被误判成受控空值。
 *
 * @param type 展开模式。
 * @param value 外部值：single 是字符串，multiple 是数组，null/undefined 视为未展开。
 * @returns 内部值集合。
 */
export function normalizeAccordionValue(
  type: AccordionType,
  value: string | string[] | null | undefined
): string[] {
  if (value === null || value === undefined) return [];

  if (type === 'single') return value === '' ? [] : [String(value)];

  return Array.isArray(value) ? value : [];
}

/**
 * 判断某一项是否展开。
 *
 * @param value 当前内部值集合。
 * @param itemValue 项的值。
 * @returns 该项是否展开。
 */
export function isAccordionItemOpen(value: string[], itemValue: string): boolean {
  return value.includes(itemValue);
}

/**
 * 计算一次展开/收起后的值集合。
 *
 * single 展开某项时**替换**整个值；收起时取决于 `collapsible`：允许则变空集合，
 * 不允许则保持原值（点击已展开项不收起，这是 Accordion 与 ToggleGroup 的关键区别）。
 * multiple 展开时追加、收起时移除。
 *
 * @param input 模式、collapsible 闸门、转移前的值、项的值与目标展开状态。
 * @returns 转移后的值集合。
 */
export function resolveAccordionValue(input: AccordionValueInput): string[] {
  const { type, collapsible, value, itemValue, open } = input;

  if (type === 'single') {
    if (open) return [itemValue];

    return collapsible ? [] : value;
  }

  return open ? [...value, itemValue] : value.filter((item) => item !== itemValue);
}

/**
 * 把内部数组还原成对外事件的负载形状。
 *
 * single 的空集合序列化成 `''`：受控 `value?: string` 以空串表达「没有展开项」，
 * 给 undefined 会让受控用法被判定为「未受控」而切换模式。
 *
 * @param type 展开模式。
 * @param value 内部值集合。
 * @returns 对外暴露的值。
 */
export function serializeAccordionValue(
  type: AccordionType,
  value: string[]
): string | string[] {
  if (type === 'single') return value[0] ?? '';

  return value;
}

/**
 * 根元素的状态属性表。
 *
 * `data-disabled` 未禁用时不输出而不是输出 false：样式层按「属性存在」写选择器。
 *
 * @param input 整组禁用状态。
 * @returns data-disabled。
 */
export function getAccordionRootAttrs(input: AccordionRootAttrsInput): Record<string, unknown> {
  return {
    'data-disabled': input.disabled ? '' : undefined,
  };
}

/**
 * 项元素的状态属性表。
 *
 * `data-state` 与 Collapsible 同词表（open / closed），样式层据此驱动箭头旋转与
 * 进出场动画；项级禁用是「组禁用或项禁用」合成后的结果。
 *
 * @param input 展开与禁用状态。
 * @returns data-state 与 data-disabled。
 */
export function getAccordionItemAttrs(input: AccordionItemAttrsInput): Record<string, unknown> {
  return {
    'data-state': input.open ? 'open' : 'closed',
    'data-disabled': input.disabled ? '' : undefined,
  };
}