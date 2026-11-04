import type { MaybeRefOrGetter, Ref } from 'vue';

import type { TabsActivationMode, TabsOrientation } from '@agile-plus/primitives/tabs';

/**
 * useTabs Composable 的配置选项。
 *
 * 同时支持受控与非受控两种模式：
 * - 非受控：仅传 defaultValue，内部维护激活状态。
 * - 受控：传入 modelValue + onValueChange，外部控制激活值。
 */
export interface UseTabsOptions {
  /**
   * 受控激活值，传入后进入受控模式。
   *
   * 使用 MaybeRefOrGetter 而非裸 string：组件封装层传入的是响应式 props，
   * 裸值会在展开时固化为快照，导致外部切换标签后面板不再响应。
   */
  modelValue?: MaybeRefOrGetter<string | undefined>;

  /** 非受控模式下的默认激活值 */
  defaultValue?: string;

  /** 激活值变化回调 */
  onValueChange?: (value: string) => void;

  /** 激活模式，默认 automatic */
  activationMode?: TabsActivationMode;

  /** 布局方向，默认 horizontal */
  orientation?: TabsOrientation;
}

/**
 * useTabs Composable 的返回值。
 *
 * 契约说明：get*Props 只返回可 v-bind 的 ARIA 属性，事件处理器单独暴露。
 * 在 Vue 中事件必须通过 v-on 显式绑定，混入 v-bind 对象不会被注册为监听器。
 */
export interface UseTabsReturn {
  /** 当前激活的 tab value（响应式） */
  activeValue: Ref<string>;

  /** 设置激活值 */
  setActive(value: string): void;

  /**
   * 注册一个 tab。
   *
   * 由 TabsTrigger 在创建时调用，value 重复注册时幂等忽略。
   * 注册顺序决定键盘导航顺序，因此必须与 DOM 顺序一致。
   */
  registerTab(value: string): void;

  /** 注销一个 tab，由 TabsTrigger 卸载时调用 */
  unregisterTab(value: string): void;

  /** 获取 tab list 容器需要绑定的属性 */
  getTabListProps(): Record<string, unknown>;

  /**
   * 获取单个 tab trigger 需要绑定的属性。
   *
   * 纯读取函数，可安全放入 computed 随状态重新求值。
   *
   * @param value 该 tab 的唯一 value 标识。
   */
  getTriggerProps(value: string): Record<string, unknown>;

  /**
   * 获取单个 tab content 面板需要绑定的属性。
   *
   * @param value 该 tab 的唯一 value 标识。
   */
  getContentProps(value: string): Record<string, unknown>;

  /**
   * 标签键盘处理器，绑定到 TabsTrigger 的 @keydown。
   *
   * @param event 原生键盘事件。
   */
  onTriggerKeydown(event: KeyboardEvent): void;
}
