import { computed, onUnmounted, ref, toValue, useId, watch } from 'vue';

import { createTabsMachine, handleTabsKeydown } from '@agile-plus/primitives/tabs';

import type { UseTabsOptions, UseTabsReturn } from './types';

/**
 * Tabs 的 Vue Composable 适配。
 *
 * 将 primitives 的状态机桥接到 Vue 响应式系统，
 * 管理 tab 注册/注销生命周期和键盘导航事件绑定。
 * 支持受控与非受控两种模式。
 *
 * @param options Composable 配置选项。
 * @returns 响应式状态、操作方法和属性绑定函数集合。
 */
export function useTabs(options: UseTabsOptions = {}): UseTabsReturn {
  const { defaultValue = '', activationMode = 'automatic', orientation = 'horizontal' } = options;

  /**
   * 实例级 id 前缀。
   *
   * 与 RadioGroup 同样的原因：id 只由 value 拼成会让多个使用相同 value 的
   * tablist 产生重复 id，aria-controls 与 aria-labelledby 因此指向错误元素。
   */
  const uid = useId();

  function getTriggerId(tabValue: string): string {
    return `${uid}-tab-${tabValue}`;
  }

  function getPanelId(tabValue: string): string {
    return `${uid}-tabpanel-${tabValue}`;
  }

  const controlledActive = computed(() => toValue(options.modelValue));

  const isControlled = computed(() => controlledActive.value !== undefined);

  const machine = createTabsMachine({
    defaultValue,
    activationMode,
    orientation,
  });

  const internalActive = ref(machine.getState().activeValue);

  const activeValue = computed(() =>
    isControlled.value ? controlledActive.value! : internalActive.value
  );

  /**
   * 状态机是唯一的状态来源，向外部广播变化。
   *
   * 键盘导航（方向键 / Home / End）通过 FOCUS_TAB 改变激活值而非 setActive，
   * 因此必须在订阅回调中上报 onValueChange，否则受控模式下方向键无效。
   * changed 需在写入 internalActive 之前捕获，否则比较恒等。
   */
  const unsubscribe = machine.subscribe((state) => {
    const changed = state.activeValue !== activeValue.value;

    if (!isControlled.value) {
      internalActive.value = state.activeValue;
    }

    if (changed) {
      options.onValueChange?.(state.activeValue);
    }
  });

  /**
   * 受控值同步进状态机。
   *
   * 状态机不驱动受控渲染，但键盘导航依赖 getState 读取 tabValues 与 focusedValue，
   * 因此需要保持其激活值与外部一致。
   */
  watch(
    controlledActive,
    (value) => {
      if (value !== undefined) {
        machine.send({ type: 'SET_ACTIVE', payload: value });
      }
    },
    { immediate: true }
  );

  /**
   * 切换激活标签。
   *
   * 非受控时只写入状态机，onValueChange 由订阅回调统一上报，避免重复触发。
   */
  function setActive(value: string): void {
    if (isControlled.value) {
      options.onValueChange?.(value);

      return;
    }

    machine.send({ type: 'SET_ACTIVE', payload: value });
  }

  function registerTab(value: string): void {
    machine.send({ type: 'REGISTER_TAB', payload: value });
  }

  function unregisterTab(value: string): void {
    machine.send({ type: 'UNREGISTER_TAB', payload: value });
  }

  /**
   * 标签键盘导航处理器。
   *
   * 状态机只负责计算下一个聚焦项，DOM 焦点必须显式移动，
   * 否则 roving tabindex 与实际焦点会分离，键盘用户将失去上下文。
   */
  function onTriggerKeydown(event: KeyboardEvent): void {
    const state = machine.getState();

    const result = handleTabsKeydown(event.key, {
      tabValues: state.tabValues,
      focusedValue: state.focusedValue,
      orientation: state.orientation,
      loop: true,
    });

    if (result.handled) {
      event.preventDefault();
    }

    if (result.nextFocusedValue !== null) {
      machine.send({ type: 'FOCUS_TAB', payload: result.nextFocusedValue });

      document.getElementById(getTriggerId(result.nextFocusedValue))?.focus();
    }

    if (event.key === 'Enter' || event.key === ' ') {
      const focused = machine.getState().focusedValue;

      if (focused !== null && activationMode === 'manual') {
        event.preventDefault();
        setActive(focused);
      }
    }
  }

  onUnmounted(() => {
    unsubscribe();
    machine.destroy();
  });

  function getTabListProps(): Record<string, unknown> {
    return {
      role: 'tablist' as const,
      'aria-orientation': orientation,
    };
  }

  function getTriggerProps(value: string): Record<string, unknown> {
    const isActive = activeValue.value === value;

    return {
      role: 'tab' as const,
      'aria-selected': isActive,
      'aria-controls': getPanelId(value),
      id: getTriggerId(value),
      tabindex: isActive ? 0 : -1,
      'data-state': isActive ? 'active' : 'inactive',
      'data-value': value,
    };
  }

  function getContentProps(value: string): Record<string, unknown> {
    const isActive = activeValue.value === value;

    return {
      role: 'tabpanel' as const,
      'aria-labelledby': getTriggerId(value),
      id: getPanelId(value),
      tabindex: 0,
      'data-state': isActive ? 'active' : 'inactive',
      'data-value': value,
      hidden: !isActive,
    };
  }

  return {
    activeValue,
    setActive,
    registerTab,
    unregisterTab,
    getTabListProps,
    getTriggerProps,
    getContentProps,
    onTriggerKeydown,
  };
}
