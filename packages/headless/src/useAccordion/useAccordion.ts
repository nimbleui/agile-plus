import { computed, toValue } from 'vue';

import {
  getAccordionRootAttrs,
  isAccordionItemOpen,
  normalizeAccordionValue,
  resolveAccordionValue,
  serializeAccordionValue,
} from '@agile-plus/primitives/accordion';

import { handleTabsKeydown } from '@agile-plus/primitives/tabs';

import { useCollection } from '../utils/useCollection';
import { useControllable } from '../utils/useControllable';

import type { AccordionType } from '@agile-plus/primitives/accordion';

import type { AccordionItemEntry, UseAccordionOptions, UseAccordionReturn } from './types';

const VALID_TYPES: AccordionType[] = ['single', 'multiple'];

/**
 * Accordion 的 Vue Composable 适配。
 *
 * 值管理与 ToggleGroup 同构（single / multiple 集合，内部统一数组），但展开转移多一个
 * `collapsible` 闸门，因此值算法走 primitives/accordion 而不是复用 toggle。
 *
 * 键盘导航复用 Tabs 的纯算法 `handleTabsKeydown`（纵向：上下箭头 + Home/End + 绕回），
 * 但**只取焦点落点、忽略 shouldActivate**：Accordion 的箭头只移动焦点，展开交给
 * Enter / Space / click（原生 button 已处理），这与 WAI-ARIA Accordion Pattern 一致。
 * 每个 Trigger 都是独立 Tab 停靠点，不做罗盘 tabindex——Accordion 与 Tabs/ToggleGroup
 * 的关键区别就在于此。
 *
 * @param options 组配置项。
 * @returns 组值读写、项登记与键盘导航。
 * @throws 当 type 缺失或不是 single / multiple 时抛出。
 */
export function useAccordion(options: UseAccordionOptions): UseAccordionReturn {
  const type = computed(() => {
    const value = toValue(options.type);

    if (!VALID_TYPES.includes(value)) {
      throw new Error('Invalid prop `type` expected on `Accordion`. Expected `single` or `multiple`.');
    }

    return value;
  });

  /**
   * 归一化必须在受控判定之后做：直接返回 [] 会让「未传 value」被误判成受控空值。
   */
  const state = useControllable<string[]>({
    value: () => {
      const raw = toValue(options.value);

      return raw === undefined ? undefined : normalizeAccordionValue(type.value, raw);
    },
    defaultValue: normalizeAccordionValue(type.value, toValue(options.defaultValue)),
    onChange: (next) => options.onValueChange?.(serializeAccordionValue(type.value, next)),
  });

  const value = state.value;

  const disabled = computed(() => toValue(options.disabled) ?? false);

  const collapsible = computed(() => toValue(options.collapsible) ?? false);

  const collection = useCollection<AccordionItemEntry>({ key: (entry) => entry.id });

  function isItemOpen(itemValue: string): boolean {
    return isAccordionItemOpen(value.value, itemValue);
  }

  function setItemOpen(itemValue: string, open: boolean): void {
    const next = resolveAccordionValue({
      type: type.value,
      collapsible: collapsible.value,
      value: value.value,
      itemValue,
      open,
    });

    // 转移结果与当前值一致时不写入：single 非 collapsible 收起已展开项是 no-op，
    // 不该冒出一个值没变的 change 事件。
    if (next.length === value.value.length && next.every((item, index) => item === value.value[index])) {
      return;
    }

    state.set(next);
  }

  function getRootAttrs(): Record<string, unknown> {
    return getAccordionRootAttrs({ disabled: disabled.value });
  }

  function onTriggerKeydown(event: KeyboardEvent, itemValue: string): void {
    if (event.target !== event.currentTarget) return;

    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

    const enabled = collection.items.value.filter((entry) => !entry.disabled.value);

    const intent = handleTabsKeydown(event.key, {
      tabValues: enabled.map((entry) => entry.value),
      focusedValue: itemValue,
      orientation: 'vertical',
      loop: true,
    });

    if (!intent.handled || intent.nextFocusedValue === null) return;

    event.preventDefault();

    const target = enabled.find((entry) => entry.value === intent.nextFocusedValue);

    target?.element.value?.focus();
  }

  return {
    type,
    value,
    disabled,
    collapsible,
    isItemOpen,
    setItemOpen,
    registerItem: collection.add,
    getRootAttrs,
    onTriggerKeydown,
  };
}