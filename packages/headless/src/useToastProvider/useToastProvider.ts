import { computed, ref, toValue } from 'vue';

import {
  DEFAULT_TOAST_DURATION,
  DEFAULT_TOAST_LABEL,
  DEFAULT_TOAST_SWIPE_DIRECTION,
  DEFAULT_TOAST_SWIPE_THRESHOLD,
} from '@agile-plus/primitives/toast';

import { useCollection } from '../utils/useCollection';

import type { UseToastProviderOptions, UseToastProviderReturn, ToastEntry } from './types';

/**
 * Toast Provider 的 Vue Composable。
 *
 * 承担三件不属于单个通知、也不属于视口的共享状态：
 *
 * 1. **portal 目标**。Radix 的通知在视口不存在时直接不渲染，通知必须挂到视口的
 *    列表元素里，这样叠放顺序、指针事件与焦点都归视口统一管。
 * 2. **在挂载的通知集合**。视口要靠它决定焦点代理是否渲染、Tab 顺序怎么排、
 *    Escape 该关哪一条；计数只在有通知时改变，不能用「组件实例数」代替——声明式
 *    用法里通知组件一直存在，只是 open 为 false。
 * 3. **暂停状态**。鼠标进入视口、窗口失焦时所有通知一起暂停计时，恢复时各自按
 *    剩余时间重开。Radix 用视口上的 DOM CustomEvent 广播，是因为通知在 React 树
 *    外；Vue 侧有 provide/inject，订阅函数即可，不需要跨树传事件。
 *
 * @param options Provider 配置。
 * @returns 供视口与通知消费的共享状态与注册入口。
 */
export function useToastProvider(options: UseToastProviderOptions = {}): UseToastProviderReturn {
  const label = computed(() => toValue(options.label) ?? DEFAULT_TOAST_LABEL);
  const duration = computed(() => toValue(options.duration) ?? DEFAULT_TOAST_DURATION);
  const swipeDirection = computed(
    () => toValue(options.swipeDirection) ?? DEFAULT_TOAST_SWIPE_DIRECTION
  );
  const swipeThreshold = computed(
    () => toValue(options.swipeThreshold) ?? DEFAULT_TOAST_SWIPE_THRESHOLD
  );
  const announceContainer = computed(() => toValue(options.announceContainer) ?? null);

  /**
   * 在挂载的通知集合。用 useCollection 而不是自己维护数组：条目里带 Ref，
   * 深响应会把它拆包成元素，视口读到的就是过期快照（原因见 utils/useCollection）。
   */
  const collection = useCollection<ToastEntry>({ key: (entry) => entry.id });

  const toasts = collection.items;

  const toastCount = computed(() => collection.items.value.length);

  const hasToasts = computed(() => collection.items.value.length > 0);

  const viewport = ref<HTMLElement | null>(null);

  const isPaused = ref(false);

  const listeners = new Set<(paused: boolean) => void>();

  // 空标签只在这里告警一次，与 Radix 的 console.error 等价：这是作者的用法错误而不是
  // 运行期状态，放进 computed 会随每次重算刷屏。
  if (!label.value.trim()) {
    console.error('Invalid prop `label` supplied to `ToastProvider`. Expected non-empty `string`.');
  }

  function setViewport(node: HTMLElement | null): void {
    viewport.value = node;
  }

  /**
   * 广播暂停状态变化。
   *
   * 状态没变时不通知，重复的 focusin / pointermove 不该让每条通知重算剩余时间。
   */
  function setPaused(next: boolean): void {
    if (isPaused.value === next) return;

    isPaused.value = next;
    listeners.forEach((listener) => listener(next));
  }

  function pauseClosing(): void {
    setPaused(true);
  }

  function resumeClosing(): void {
    setPaused(false);
  }

  function subscribeClosing(listener: (paused: boolean) => void): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  return {
    label,
    duration,
    swipeDirection,
    swipeThreshold,
    announceContainer,
    toasts,
    toastCount,
    hasToasts,
    viewport,
    setViewport,
    registerToast: collection.add,
    isClosePaused: computed(() => isPaused.value),
    pauseClosing,
    resumeClosing,
    subscribeClosing,
  };
}
