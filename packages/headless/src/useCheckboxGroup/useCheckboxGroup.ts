import { computed, toValue } from 'vue';

import { isGroupValueChecked, toggleGroupValue } from '@agile-plus/primitives/checkbox';

import { useControllable } from '../utils/useControllable';

import type { CheckboxCheckedState } from '@agile-plus/primitives/checkbox';

import type { UseCheckboxGroupOptions, UseCheckboxGroupReturn } from './types';

/**
 * CheckboxGroup 的 Vue Composable 适配。
 *
 * 组只维护一个值数组，勾选状态是「值是否在数组里」的派生结果，因此不需要
 * 注册表：项的顺序与禁用态由各 Item 自己持有，数组增删交给 primitives 纯函数。
 *
 * @param options Composable 配置选项。
 * @returns 响应式值集合、操作方法与属性绑定函数。
 */
export function useCheckboxGroup(options: UseCheckboxGroupOptions = {}): UseCheckboxGroupReturn {
  const { defaultValue = [] } = options;

  const state = useControllable<string[]>({
    value: () => toValue(options.modelValue),
    // 拷贝一份：调用方传入的数组不该被当成内部状态持有，否则外部改写会穿透进来。
    defaultValue: [...defaultValue],
    onChange: (next) => options.onValueChange?.(next),
  });

  const values = state.value;

  const isDisabled = computed(() => toValue(options.disabled) === true);

  const isRequired = computed(() => toValue(options.required) === true);

  /**
   * 组级字段名。
   *
   * 隐藏 input 由每一项自己渲染（与 Radix 的 BubbleInput 同一套接线），name 由组下发，
   * 提交时得到同名多值；组容器上不生成 input，避免同一个 name 出现两份数据。
   */
  const name = computed(() => toValue(options.name));

  function setValues(next: string[]): void {
    state.set(next);
  }

  function setItemChecked(value: string, checked: CheckboxCheckedState): void {
    setValues(toggleGroupValue(values.value, value, checked));
  }

  function isValueChecked(value: string): boolean {
    return isGroupValueChecked(values.value, value);
  }

  function getRootProps(): Record<string, unknown> {
    const labelledby = toValue(options.ariaLabelledby);
    const describedby = toValue(options.ariaDescribedby);

    return {
      role: 'group',
      'aria-labelledby': labelledby || undefined,
      'aria-describedby': describedby || undefined,
      'aria-required': isRequired.value ? 'true' : undefined,
      'aria-disabled': isDisabled.value || undefined,
      'data-disabled': isDisabled.value || undefined,
    };
  }

  return {
    values,
    isDisabled,
    name,
    setValues,
    setItemChecked,
    isValueChecked,
    getRootProps,
  };
}
