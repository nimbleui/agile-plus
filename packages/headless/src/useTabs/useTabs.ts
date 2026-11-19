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

  /**
   * trigger 元素登记表。
   *
   * 键盘导航必须用这里登记的元素入口，而不是 `document.getElementById`：
   * 后者拿不到 Shadow DOM 内的节点，多实例 value 重名时还会聚焦到别的标签页。
   */
  const triggerElements = new Map<string, HTMLElement>();

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
  const internalFocused = ref<string | null>(machine.getState().focusedValue);

  const activeValue = computed(() =>
    isControlled.value ? controlledActive.value! : internalActive.value
  );

  /**
   * 状态机是唯一的状态来源，向外部广播变化。
   *
   * 键盘导航只通过 FOCUS_TAB 移动焦点；激活统一走 SET_ACTIVE（见 onTriggerKeydown），
   * 所以这里只在激活值真的变化时上报，受控值不会被焦点态悄悄改写。
   * changed 需在写入 internalActive 之前捕获，否则比较恒等。
   */
  const unsubscribe = machine.subscribe((state) => {
    const changed = state.activeValue !== activeValue.value;

    if (!isControlled.value) {
      internalActive.value = state.activeValue;
    }

    // 焦点是独立的响应式状态：manual 模式下它变化而 activeValue 不变，
    // 依赖 getTriggerProps 的 computed 也必须跟着重算 roving tabindex。
    internalFocused.value = state.focusedValue;

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

  function registerTab(value: string, element?: HTMLElement | null): void {
    machine.send({ type: 'REGISTER_TAB', payload: value });

    if (element) triggerElements.set(value, element);
  }

  function unregisterTab(value: string): void {
    machine.send({ type: 'UNREGISTER_TAB', payload: value });
    triggerElements.delete(value);
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
      const nextValue = result.nextFocusedValue;

      // 焦点态与激活态解耦：先只移动焦点，automatic 再显式走 setActive 触发激活。
      machine.send({ type: 'FOCUS_TAB', payload: nextValue });
      triggerElements.get(nextValue)?.focus();

      if (activationMode === 'automatic' && result.shouldActivate) setActive(nextValue);
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
    // roving tabindex 跟的是真实焦点而非激活值：manual 模式下二者分离，
    // 若用 activeValue 判定，方向键移过去的按钮仍不可 Tab 访问。
    const focused = internalFocused.value ?? activeValue.value;
    const isFocused = focused === value;

    return {
      role: 'tab' as const,
      'aria-selected': isActive,
      'aria-controls': getPanelId(value),
      id: getTriggerId(value),
      tabindex: isFocused ? 0 : -1,
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
