import { computed, toValue } from 'vue';

import { getToggleDataState, resolveNextTogglePressed } from '@agile-plus/primitives/toggle';

import { useControllable } from '../utils/useControllable';

import type { UseToggleOptions, UseToggleReturn } from './types';

/**
 * Toggle 的 Vue Composable 适配。
 *
 * 状态只有一个布尔值，没有状态机：Radix 的 Toggle 同样只是 `useControllableState`
 * 加一次取反。为它建状态机不会带来任何被保护的不变量，因此这里只做受控桥接。
 *
 * ToggleGroupItem 复用同一个 composable——Radix 也是这么做的：项内部渲染 Toggle，
 * 只是把 `pressed` 换成「组值里是否包含自己」、把 `onPressedChange` 转交给组。
 *
 * @param options Composable 配置项。
 * @returns 状态、操作方法与属性绑定函数。
 */
export function useToggle(options: UseToggleOptions = {}): UseToggleReturn {
  const state = useControllable<boolean>({
    value: () => toValue(options.pressed),
    defaultValue: options.defaultPressed ?? false,
    onChange: (value) => options.onPressedChange?.(value),
  });

  const pressed = state.value;

  const disabled = computed(() => toValue(options.disabled) ?? false);

  function setPressed(value: boolean): void {
    state.set(value);
  }

  function toggle(): void {
    setPressed(!pressed.value);
  }

  function onClick(): void {
    const next = resolveNextTogglePressed({ pressed: pressed.value, disabled: disabled.value });

    if (next !== null) setPressed(next);
  }

  function getRootProps(): Record<string, unknown> {
    return {
      type: 'button',
      // aria-pressed 始终输出：开关的存在本身要靠它表达，缺席会被读成普通按钮。
      'aria-pressed': pressed.value,
      'data-state': getToggleDataState(pressed.value),
      ...(disabled.value ? { disabled: true, 'data-disabled': '' } : null),
    };
  }

  return { pressed, disabled, setPressed, toggle, getRootProps, onClick };
}
