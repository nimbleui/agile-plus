import type { ToastSwipeDirection } from '@agile-plus/primitives/toast';

import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

/**
 * useToastProvider 的配置项。
 *
 * 全部使用 MaybeRefOrGetter：封装层传进来的是响应式 props，裸值会在展开时固化成
 * 快照，主题或时长随语言切换变化时通知层读到的还是旧值。
 */
export interface UseToastProviderOptions {
  /**
   * 每条通知的作者侧标签，作为 announcer 文本前缀。
   *
   * 默认 'Notification'，与 Radix 一致；读屏时念作「Notification 已保存」。
   */
  label?: MaybeRefOrGetter<string | undefined>;

  /**
   * 自动关闭时长，单位毫秒。
   *
   * 默认 5000；传 0、NaN 或 Infinity 表示不自动关闭。
   */
  duration?: MaybeRefOrGetter<number | undefined>;

  /** 触发关闭的滑动方向，默认 'right' */
  swipeDirection?: MaybeRefOrGetter<ToastSwipeDirection | undefined>;

  /** 关闭所需的最小滑动距离，单位像素，默认 50 */
  swipeThreshold?: MaybeRefOrGetter<number | undefined>;

  /**
   * announcer 挂载的容器。
   *
   * 默认跟随 viewport 的 Teleport 目标（body）。在焦点陷阱或模态框内使用时需要
   * 指向容器内部，否则 `aria-modal` 会让通知读不出来——这与 Radix 的
   * `announcerContainer` 同一动机。
   */
  announceContainer?: MaybeRefOrGetter<Element | DocumentFragment | null | undefined>;
}

/**
 * Provider 登记的一条通知。
 *
 * 保存元素 Ref 而不是元素本身：通知是 portal 进视口的，注册时机早于元素挂载，
 * 视口在遍历 Tab 候选与判定焦点归属时才需要真实节点。
 */
export interface ToastEntry {
  /** 通知实例 id，用于稳定去重与卸载 */
  id: string;

  /** 通知根元素 */
  element: Ref<HTMLElement | null>;

  /** 关闭这条通知，供视口的 Escape 处理调用 */
  close(): void;
}

/**
 * useToastProvider 的返回值，同时是 Provider 下发给子组件的上下文。
 */
export interface UseToastProviderReturn {
  /** 通知标签 */
  label: ComputedRef<string>;

  /** 默认自动关闭时长 */
  duration: ComputedRef<number>;

  /** 滑动方向 */
  swipeDirection: ComputedRef<ToastSwipeDirection>;

  /** 滑动关闭阈值 */
  swipeThreshold: ComputedRef<number>;

  /** announcer 容器，未配置时为 null */
  announceContainer: ComputedRef<Element | DocumentFragment | null>;

  /** 当前挂载中的通知，按注册顺序（旧→新） */
  toasts: ComputedRef<ToastEntry[]>;

  /** 当前挂载中的通知数量 */
  toastCount: ComputedRef<number>;

  /** 是否存在通知，决定视口是否接管指针事件与焦点代理 */
  hasToasts: ComputedRef<boolean>;

  /** 通知 portal 的目标（视口的列表元素），未渲染时为 null */
  viewport: Ref<HTMLElement | null>;

  /**
   * 由视口登记 portal 目标。
   *
   * @param node 列表元素，卸载时传 null。
   */
  setViewport(node: HTMLElement | null): void;

  /**
   * 登记一条正在挂载的通知。
   *
   * @param entry 通知条目。
   * @returns 注销函数。
   */
  registerToast(entry: ToastEntry): () => void;

  /** 自动关闭是否处于暂停状态 */
  isClosePaused: ComputedRef<boolean>;

  /** 暂停所有通知的自动关闭，重复调用无副作用 */
  pauseClosing(): void;

  /** 恢复自动关闭，重复调用无副作用 */
  resumeClosing(): void;

  /**
   * 订阅暂停状态变化，通知用它决定计时器是暂停还是恢复。
   *
   * @param listener 接收新的暂停状态。
   * @returns 取消订阅函数。
   */
  subscribeClosing(listener: (paused: boolean) => void): () => void;
}
