import { computed, toValue, useId } from 'vue';

import { handleRadioGroupKeydown } from '@agile-plus/primitives/radio-group';

import { useCollection } from '../utils/useCollection';

import { useControllable } from '../utils/useControllable';

import type { RadioGroupItemEntry, UseRadioGroupOptions, UseRadioGroupReturn } from './types';

/**
 * RadioGroup 的 Vue Composable 适配。
 *
 * 管理选中值、item 注册表、禁用合并与键盘导航后的焦点移动。
 * 支持受控与非受控两种模式。
 *
 * @param options Composable 配置选项。
 * @returns 响应式状态、注册方法与属性绑定函数集合。
 */
export function useRadioGroup(options: UseRadioGroupOptions = {}): UseRadioGroupReturn {
  const { defaultValue = '', loop = true } = options;

  /**
   * 实例级 id 前缀。
   *
   * item 的 id 由前缀加 value 组成，避免同一页面存在多个值相同的组时 id 冲突；
   * useId 在 SSR 下与服务端渲染结果一致，不会触发注水不匹配。
   */
  const uid = useId();

  const state = useControllable<string>({
    value: () => toValue(options.modelValue),
    defaultValue: defaultValue,
    onChange: (next) => options.onValueChange?.(next),
  });

  const value = state.value;

  const isGroupDisabled = computed(() => toValue(options.disabled) === true);

  const hasName = computed(() => !!toValue(options.name));

  const collection = useCollection<RadioGroupItemEntry>({ key: (item) => item.value });

  /** 已过滤禁用项的可用列表，顺序即键盘导航顺序。 */
  const enabledValues = computed(() =>
    isGroupDisabled.value
      ? []
      : collection.items.value.filter((item) => !item.disabled).map((item) => item.value)
  );

  /**
   * 组内唯一的 tab stop。
   *
   * 有选中项时是选中项；未选中时是第一个可用项——这是 radio group 的标准语义：
   * Tab 键一次进入整组并落在当前值上，组内移动只能使用方向键。
   */
  const tabStopValue = computed(() =>
    value.value === '' ? (enabledValues.value[0] ?? '') : value.value
  );

  function getItemId(itemValue: string): string {
    return `${uid}-radio-${itemValue}`;
  }

  function setValue(next: string): void {
    state.set(next);
  }

  /**
   * 登记一个项。
   *
   * 已存在时**保留**原条目而不是覆盖：项的 disabled 状态由它自己的 watch 增量上报，
   * 重新登记若重置成 false，禁用项会重新出现在 Tab 序列里。
   */
  function registerItem(itemValue: string): void {
    if (collection.items.value.some((item) => item.value === itemValue)) return;

    collection.add({ value: itemValue, disabled: false });
  }

  function setItemDisabled(itemValue: string, disabled: boolean): void {
    const current = collection.items.value.find((item) => item.value === itemValue);

    if (!current || current.disabled === disabled) return;

    collection.replace({ value: itemValue, disabled });
  }

  function unregisterItem(itemValue: string): void {
    collection.remove(itemValue);

    // 受控模式的选中值由外部持有，此处不越权清空，否则会静默改写调用方状态；
    // replace 在受控下本身就是空操作。卸载子项也不是用户操作，不该冒出 change 事件。
    if (value.value === itemValue) state.replace('');
  }

  function isItemDisabled(itemValue: string): boolean {
    if (isGroupDisabled.value) return true;

    return collection.items.value.find((item) => item.value === itemValue)?.disabled === true;
  }

  /**
   * 处理组内方向键导航。
   *
   * 选中与移动焦点必须同时发生：radio 语义下方向键既换焦点也换选中值，
   * 只移动焦点会让 aria-checked 与视觉状态分离。
   */
  function onItemKeydown(event: KeyboardEvent): void {
    const current = event.currentTarget as HTMLElement | null;
    const focusedValue = current?.dataset.value ?? null;

    const result = handleRadioGroupKeydown(event.key, {
      enabledValues: enabledValues.value,
      focusedValue,
      loop,
    });

    if (!result.handled) return;

    event.preventDefault();

    if (result.nextValue === null) return;

    setValue(result.nextValue);

    document.getElementById(getItemId(result.nextValue))?.focus();
  }

  function getRootProps(): Record<string, unknown> {
    const required = toValue(options.required) === true;
    const labelledby = toValue(options.ariaLabelledby);
    const describedby = toValue(options.ariaDescribedby);
    const orientation = toValue(options.orientation) ?? 'horizontal';

    return {
      role: 'radiogroup' as const,
      'aria-orientation': orientation,
      // 样式层依赖 data-* 而非 aria-*：ARIA 属性面向辅助技术，不应成为视觉契约。
      'data-orientation': orientation,
      'aria-required': required || undefined,
      'aria-labelledby': labelledby || undefined,
      'aria-describedby': describedby || undefined,
      'aria-disabled': isGroupDisabled.value || undefined,
      'data-disabled': isGroupDisabled.value || undefined,
    };
  }

  function getItemProps(itemValue: string): Record<string, unknown> {
    const checked = value.value === itemValue;
    const disabled = isItemDisabled(itemValue);
    const focusable = !disabled && (checked || tabStopValue.value === itemValue);

    return {
      id: getItemId(itemValue),
      role: 'radio' as const,
      'aria-checked': checked,
      'aria-disabled': disabled || undefined,
      tabindex: focusable ? 0 : -1,
      'data-state': checked ? 'checked' : 'unchecked',
      'data-disabled': disabled || undefined,
      'data-value': itemValue,
      'data-orientation': toValue(options.orientation) ?? 'horizontal',
    };
  }

  /**
   * 隐藏原生 input 的属性。
   *
   * checked 直接由选中值决定，浏览器在同一 name 分组内会自然维持互斥；
   * 禁用项输出 disabled 而不是省略字段，提交时由浏览器负责忽略它。
   */
  function getInputProps(itemValue: string): Record<string, unknown> | null {
    const name = toValue(options.name);

    if (!name) return null;

    return {
      type: 'radio' as const,
      name,
      value: itemValue,
      checked: value.value === itemValue,
      disabled: isItemDisabled(itemValue),
      tabindex: -1,
      'aria-hidden': true,
    };
  }

  return {
    value,
    isGroupDisabled,
    hasName,
    setValue,
    registerItem,
    setItemDisabled,
    unregisterItem,
    isItemDisabled,
    getRootProps,
    getItemProps,
    getInputProps,
    onItemKeydown,
  };
}
