import type {
  ToastPoint,
  ToastSwipeDirection,
  ToastSwipePhase,
  ToastType,
} from '@agile-plus/primitives/toast';

import type { UseToastProviderReturn } from '../useToastProvider';

import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

/**
 * 滑动手势回调的事件负载。
 *
 * Radix 用 CustomEvent 携带 detail，是因为它的默认行为（写 data-swipe 与 CSS 变量）
 * 靠 composeEventHandlers 与自定义事件一起实现。本库把默认行为放进响应式状态，
 * 对外只暴露语义化的负载，消费者不需要构造或取消 CustomEvent。
 */
export interface ToastSwipeDetail {
  /** 触发手势的原生指针事件 */
  originalEvent: PointerEvent;

  /** 钳制后的位移：只保留手势轴，且不朝反方向越界 */
  delta: ToastPoint;
}

/**
 * useToast 的配置项。
 */
export interface UseToastOptions {
  /** Provider 上下文，由 UI 层注入后传入 */
  provider: UseToastProviderReturn;

  /**
   * 受控打开状态，传入后进入受控模式。
   *
   * `undefined` 表示未受控，这是受控判定的依据，因此类型必须允许 undefined；
   * 布尔 prop 在封装层会被 cast 成 false，导致误判为受控并立刻关闭通知。
   */
  open?: MaybeRefOrGetter<boolean | undefined>;

  /** 非受控模式下的初始打开状态，默认 true（通知一挂载就该出现） */
  defaultOpen?: boolean;

  /** 打开状态变化回调 */
  onOpenChange?: (open: boolean) => void;

  /**
   * 本条通知的时长，覆盖 Provider 的默认值。
   *
   * 0、NaN、Infinity 表示不自动关闭。
   */
  duration?: MaybeRefOrGetter<number | undefined>;

  /**
   * 通知敏感度，决定 announcer 的 aria-live，默认 `foreground`。
   *
   * `foreground` 用 assertive 立刻打断，`background` 用 polite 等待当前朗读结束。
   */
  type?: MaybeRefOrGetter<ToastType | undefined>;

  /** 强制保留在 DOM 中，用于外部接管动画，默认 false */
  forceMount?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * Escape 处理器；调用 `preventDefault()` 可阻止关闭。
   *
   * @param event 原生键盘事件。
   */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;

  /** 自动计时被暂停时回调 */
  onPause?: () => void;

  /** 自动计时恢复时回调 */
  onResume?: () => void;

  /** 滑动开始（越过启动阈值）时回调 */
  onSwipeStart?: (detail: ToastSwipeDetail) => void;

  /** 滑动过程中回调 */
  onSwipeMove?: (detail: ToastSwipeDetail) => void;

  /** 滑动未达阈值而回弹时回调 */
  onSwipeCancel?: (detail: ToastSwipeDetail) => void;

  /** 滑动达到阈值、即将关闭时回调 */
  onSwipeEnd?: (detail: ToastSwipeDetail) => void;
}

/**
 * useToast 的返回值。
 *
 * 契约：get*Props 只返回可 v-bind 的属性，事件处理器单独暴露。
 */
export interface UseToastReturn {
  /** 当前是否打开；关闭动画期间仍为 false，而 isPresent 保持 true */
  isOpen: ComputedRef<boolean>;

  /** 是否应当渲染在 DOM 中 */
  isPresent: ComputedRef<boolean>;

  /** 通知根元素 */
  element: Ref<HTMLElement | null>;

  /**
   * 绑定根元素，传给模板 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  bindElement(node: unknown): void;

  /** 关闭通知，Action/Close 按钮走这里 */
  close(): void;

  /** 滑动手势阶段，无手势时为 null（此时不输出 data-swipe 属性） */
  swipePhase: ComputedRef<ToastSwipePhase | null>;

  /** 手势方向，始终跟随 Provider */
  swipeDirection: ComputedRef<ToastSwipeDirection>;

  /** 获取通知根元素属性：tabindex、data-* 与位移 CSS 变量、内联防误选手势样式 */
  getRootProps(): Record<string, unknown>;

  /** 是否渲染 announcer；朗读内容存活期结束后为 false */
  isAnnounceVisible: ComputedRef<boolean>;

  /** 需要播报的文本片段，未到渲染时机时为 null */
  announceText: ComputedRef<string[] | null>;

  /** announcer 的前缀标签 */
  announceLabel: ComputedRef<string>;

  /** announcer 的 Teleport 目标 */
  announceTarget: ComputedRef<Element | DocumentFragment | 'body'>;

  /** 获取 announcer 属性：role="status"、aria-live 与视觉隐藏样式 */
  getAnnounceProps(): Record<string, unknown>;

  /**
   * 根元素键盘处理器，绑定到 @keydown。
   *
   * @param event 原生键盘事件。
   */
  onRootKeydown(event: KeyboardEvent): void;

  /**
   * 根元素指针按下处理器，绑定到 @pointerdown。
   *
   * @param event 原生指针事件。
   */
  onRootPointerdown(event: PointerEvent): void;

  /**
   * 根元素指针移动处理器，绑定到 @pointermove。
   *
   * @param event 原生指针事件。
   */
  onRootPointermove(event: PointerEvent): void;

  /**
   * 根元素指针抬起处理器，绑定到 @pointerup。
   *
   * @param event 原生指针事件。
   */
  onRootPointerup(event: PointerEvent): void;
}
