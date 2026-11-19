import { computed, onMounted, onScopeDispose, ref, toValue, watch } from 'vue';

import {
  DEFAULT_TOAST_VIEWPORT_HOTKEY,
  DEFAULT_TOAST_VIEWPORT_LABEL,
  VISUALLY_HIDDEN_STYLE,
  formatToastHotkey,
  isToastHotkeyPressed,
  resolveToastViewportLabel,
} from '@agile-plus/primitives/toast';

import { focusFirst, getTabbableCandidates } from '@agile-plus/primitives/dom';

import { isBrowser } from '../utils/env';

import type { UseToastViewportOptions, UseToastViewportReturn } from './types';

/** 焦点代理的两个位置，与通知的视觉叠放方向对应。 */
type ProxyPosition = 'head' | 'tail';

/**
 * 把模板 ref 的入参收敛成 HTMLElement | null。
 *
 * @param node 元素实例或 null。
 * @returns 元素实例，非元素时归一为 null。
 */
function asElement(node: unknown): HTMLElement | null {
  return node instanceof HTMLElement ? node : null;
}

/**
 * Toast Viewport 的 Vue Composable。
 *
 * 视口是通知的 portal 目标，也是键盘可达性的真正负责人。Radix 在这里做了三件
 * 在 Vue 里同样需要显式实现的事：
 *
 * 1. **反向 Tab 顺序**。通知被 portal 进列表，DOM 顺序是「旧→新」，视觉上最新的一条
 *    却在最前。浏览器 Tab 走 DOM 顺序，所以必须接管 Tab 键按视觉顺序遍历，并用两个
 *    焦点代理把进出视口的两条路径接住。
 * 2. **暂停/恢复**。鼠标移动、焦点进入、窗口失焦都要停表，回来时按剩余时间继续。
 *    这些事件挂在包裹层上（通知不在本组件子树里，Vue 的事件绑定管不到它们的
 *    祖先元素，但冒泡仍会经过真实 DOM 父级，所以包裹层监听有效）。
 * 3. **快捷键聚焦**。读屏用户被通知打断后，需要一键把焦点送到视口去操作通知内容。
 *
 * @param options 视口配置，必须带上 Provider 上下文。
 * @returns 视口与焦点代理的属性、绑定入口和事件处理器。
 */
export function useToastViewport(options: UseToastViewportOptions): UseToastViewportReturn {
  const { provider } = options;

  const wrapper = ref<HTMLElement | null>(null);
  const listElement = ref<HTMLElement | null>(null);
  const headProxy = ref<HTMLElement | null>(null);
  const tailProxy = ref<HTMLElement | null>(null);

  const hotkey = computed(() => toValue(options.hotkey) ?? DEFAULT_TOAST_VIEWPORT_HOTKEY);
  const hotkeyLabel = computed(() => formatToastHotkey(hotkey.value));
  const ariaLabel = computed(() =>
    resolveToastViewportLabel(toValue(options.label) ?? DEFAULT_TOAST_VIEWPORT_LABEL, hotkey.value)
  );

  /**
   * 按期望的遍历顺序取出可聚焦候选。
   *
   * 每条通知的候选是「通知本体 + 内部可聚焦元素」；正向遍历时要从最新的通知开始，
   * 所以通知之间要逆序、而单条内部保持正序——两层逆序的方向不同，是 Radix 这段
   * 逻辑最容易写反的地方，这里拆开写清楚。
   */
  function getSortedCandidates(direction: 'forwards' | 'backwards'): HTMLElement[] {
    // 先摘掉未挂载的通知再决定顺序；空项若留在二维数组里，reverse 会让 Tab 序列
    // 随通知挂载时机的不同而抖动（焦点忽然跳到下一条）。
    const perToast = provider.toasts.value
      .map((entry) => entry.element.value)
      .filter((node): node is HTMLElement => node !== null)
      .map((node) => {
        const candidates = [node, ...getTabbableCandidates(node)];

        return direction === 'forwards' ? candidates : candidates.reverse();
      });

    const ordered = direction === 'forwards' ? perToast.reverse() : perToast;

    return ordered.flat();
  }

  function focusProxy(position: ProxyPosition): void {
    (position === 'head' ? headProxy.value : tailProxy.value)?.focus();
  }

  /**
   * 焦点代理被聚焦时的分流。
   *
   * 只有从视口外部进来的焦点才需要转发给通知；从通知内部 Tab 出来时停在代理上，
   * 让浏览器继续把焦点交还给文档，否则会形成 Tab 循环。
   */
  function handleProxyFocus(event: FocusEvent, position: ProxyPosition): void {
    const previous = event.relatedTarget;

    if (previous instanceof Node && listElement.value?.contains(previous)) return;

    focusFirst(getSortedCandidates(position === 'head' ? 'forwards' : 'backwards'));
  }

  /**
   * Escape 关掉最上面一条通知。
   *
   * Radix 靠 DismissableLayer 决定哪一层响应；本库还没有层级管理器，用两条可验证的
   * 规则代替：焦点在某条通知内部时不代劳（该通知自己的 keydown 会关它），焦点在
   * `aria-modal` 容器内时让给模态框。其余情况按注册顺序取最新一条。
   */
  function handleEscape(event: KeyboardEvent): void {
    if (!provider.hasToasts.value) return;

    const activeElement = document.activeElement;

    const isFocusInsideToast = provider.toasts.value.some((entry) =>
      entry.element.value?.contains(activeElement)
    );

    if (isFocusInsideToast) return;

    const modal = document.querySelector('[aria-modal="true"]');

    if (modal?.contains(activeElement)) return;

    const topmost = provider.toasts.value.at(-1);

    if (!topmost) return;

    event.preventDefault();
    topmost.close();
  }

  function handleDocumentKeydown(event: KeyboardEvent): void {
    if (isToastHotkeyPressed(event, hotkey.value)) {
      listElement.value?.focus();

      return;
    }

    if (event.key === 'Escape') handleEscape(event);
  }

  function handleWindowBlur(): void {
    provider.pauseClosing();
  }

  function handleWindowFocus(): void {
    provider.resumeClosing();
  }

  let isWindowListening = false;

  // 没有通知时不挂 window 监听，避免空转——这与 Radix 把效果按 hasToasts 门等价的。
  watch(
    provider.hasToasts,
    (hasToasts) => {
      if (!isBrowser || (hasToasts && isWindowListening)) return;

      if (hasToasts) {
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('focus', handleWindowFocus);
        isWindowListening = true;

        return;
      }

      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      isWindowListening = false;
    },
    { immediate: true }
  );

  onMounted(() => {
    if (!isBrowser) return;

    document.addEventListener('keydown', handleDocumentKeydown);
  });

  onScopeDispose(() => {
    if (!isBrowser) return;

    document.removeEventListener('keydown', handleDocumentKeydown);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    isWindowListening = false;
  });

  function bindWrapper(node: unknown): void {
    wrapper.value = asElement(node);
  }

  function bindList(node: unknown): void {
    listElement.value = asElement(node);
    provider.setViewport(listElement.value);
  }

  function bindHeadProxy(node: unknown): void {
    headProxy.value = asElement(node);
  }

  function bindTailProxy(node: unknown): void {
    tailProxy.value = asElement(node);
  }

  function getWrapperProps(): Record<string, unknown> {
    return {
      role: 'region',
      'aria-label': ariaLabel.value,
      // 列表本身可聚焦：移除条目后焦点要有落脚点，读屏才能播报剩余数量。
      tabindex: -1,
      // 空列表也可能有 padding，不关掉 pointer-events 会挡住它覆盖的页面交互。
      style: { pointerEvents: provider.hasToasts.value ? 'auto' : 'none' },
    };
  }

  function getListProps(): Record<string, unknown> {
    return { tabindex: -1 };
  }

  function getProxyProps(position: ProxyPosition): Record<string, unknown> {
    return {
      tabindex: 0,
      // position: fixed 防止 Tab 到代理时页面滚动。
      style: { ...VISUALLY_HIDDEN_STYLE, position: 'fixed' },
      'data-toast-focus-proxy': position,
    };
  }

  function onWrapperFocusin(): void {
    if (!provider.hasToasts.value) return;

    provider.pauseClosing();
  }

  function onWrapperFocusout(event: FocusEvent): void {
    const isMovingOutside =
      !(event.relatedTarget instanceof Node) || !wrapper.value?.contains(event.relatedTarget);

    if (isMovingOutside) provider.resumeClosing();
  }

  function onWrapperPointermove(): void {
    if (!provider.hasToasts.value) return;

    provider.pauseClosing();
  }

  function onWrapperPointerleave(): void {
    if (!wrapper.value) return;

    const isFocusInside = wrapper.value.contains(document.activeElement);

    if (!isFocusInside) provider.resumeClosing();
  }

  function onListKeydown(event: KeyboardEvent): void {
    const list = listElement.value;

    if (!list) return;

    const isMetaKey = event.altKey || event.ctrlKey || event.metaKey;

    if (event.key !== 'Tab' || isMetaKey) return;

    const isTabbingBackwards = event.shiftKey;

    // 从通知 Tab 回到视口本体时，直接代理到文档头部，把按键交还浏览器。
    if (event.target === list && isTabbingBackwards) {
      focusProxy('head');

      return;
    }

    const direction = isTabbingBackwards ? 'backwards' : 'forwards';
    const sorted = getSortedCandidates(direction);
    const focusedElement = document.activeElement;
    const index = sorted.findIndex((candidate) => candidate === focusedElement);

    if (focusFirst(sorted.slice(index + 1))) {
      event.preventDefault();

      return;
    }

    focusProxy(isTabbingBackwards ? 'head' : 'tail');
  }

  function onHeadProxyFocus(event: FocusEvent): void {
    handleProxyFocus(event, 'head');
  }

  function onTailProxyFocus(event: FocusEvent): void {
    handleProxyFocus(event, 'tail');
  }

  return {
    hasToasts: provider.hasToasts,
    toastCount: provider.toastCount,
    ariaLabel,
    hotkeyLabel,
    listElement,
    bindWrapper,
    bindList,
    bindHeadProxy,
    bindTailProxy,
    getWrapperProps,
    getListProps,
    getHeadProxyProps: () => getProxyProps('head'),
    getTailProxyProps: () => getProxyProps('tail'),
    onWrapperFocusin,
    onWrapperFocusout,
    onWrapperPointermove,
    onWrapperPointerleave,
    onListKeydown,
    onHeadProxyFocus,
    onTailProxyFocus,
  };
}
