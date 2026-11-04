import type { UseToastProviderReturn } from '../useToastProvider';

import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

/**
 * useToastViewport 的配置项。
 */
export interface UseToastViewportOptions {
  /**
   * Provider 上下文。
   *
   * 由调用方（UI 层）注入而不是在 composable 内部 inject：headless 层保持与
   * provide/inject 无关，同一套逻辑可以被手写渲染函数的消费者复用。
   */
  provider: UseToastProviderReturn;

  /**
   * 把焦点移动到视口的快捷键。
   *
   * 每项要么是 KeyboardEvent 的布尔标志名（`altKey`），要么是 `event.code`
   * （`F8`、`KeyT`）。默认 `['F8']`，与 Radix 一致。
   */
  hotkey?: MaybeRefOrGetter<string[] | undefined>;

  /**
   * 视口的 aria-label 模板，默认 `'Notifications ({hotkey})'`。
   *
   * `{hotkey}` 会替换成格式化后的按键组合。
   */
  label?: MaybeRefOrGetter<string | undefined>;
}

/**
 * useToastViewport 的返回值。
 *
 * 契约与库内其它 composable 一致：get*Props 只返回可 v-bind 的属性，事件处理器
 * 单独暴露给 v-on。
 */
export interface UseToastViewportReturn {
  /** 是否存在正在挂载的通知 */
  hasToasts: ComputedRef<boolean>;

  /** 当前通知数量 */
  toastCount: ComputedRef<number>;

  /** 视口包裹层的 aria-label */
  ariaLabel: ComputedRef<string>;

  /** 格式化后的快捷键文案，用于自定义说明文本 */
  hotkeyLabel: ComputedRef<string>;

  /** 通知 portal 的列表元素 */
  listElement: Ref<HTMLElement | null>;

  /**
   * 绑定包裹层元素，传给模板 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  bindWrapper(node: unknown): void;

  /**
   * 绑定列表元素并登记为 portal 目标，传给模板 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  bindList(node: unknown): void;

  /**
   * 绑定头部焦点代理，传给模板 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  bindHeadProxy(node: unknown): void;

  /**
   * 绑定尾部焦点代理，传给模板 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  bindTailProxy(node: unknown): void;

  /** 获取包裹层属性：role="region"、aria-label、tabindex 与空列表的 pointer-events */
  getWrapperProps(): Record<string, unknown>;

  /** 获取列表属性：tabindex=-1，让移除条目时焦点有落脚点 */
  getListProps(): Record<string, unknown>;

  /** 获取头部焦点代理属性 */
  getHeadProxyProps(): Record<string, unknown>;

  /** 获取尾部焦点代理属性 */
  getTailProxyProps(): Record<string, unknown>;

  /** 焦点进入包裹层，暂停自动关闭；绑定到 @focusin */
  onWrapperFocusin(): void;

  /**
   * 焦点离开包裹层，且落点也在层外时恢复计时；绑定到 @focusout。
   *
   * @param event 原生焦点事件。
   */
  onWrapperFocusout(event: FocusEvent): void;

  /** 指针进入包裹层，暂停自动关闭；绑定到 @pointermove */
  onWrapperPointermove(): void;

  /** 指针离开包裹层，且焦点不在层内时恢复计时；绑定到 @pointerleave */
  onWrapperPointerleave(): void;

  /**
   * 接管列表内的 Tab 键，按视觉叠放顺序遍历通知；绑定到 @keydown。
   *
   * @param event 原生键盘事件。
   */
  onListKeydown(event: KeyboardEvent): void;

  /**
   * 头部焦点代理获得焦点；绑定到代理元素的 @focus。
   *
   * @param event 原生焦点事件。
   */
  onHeadProxyFocus(event: FocusEvent): void;

  /**
   * 尾部焦点代理获得焦点；绑定到代理元素的 @focus。
   *
   * @param event 原生焦点事件。
   */
  onTailProxyFocus(event: FocusEvent): void;
}
