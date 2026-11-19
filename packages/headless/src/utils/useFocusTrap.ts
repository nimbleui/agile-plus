import { onScopeDispose, toValue, watch } from 'vue';

import { getTabbableCandidates } from '@agile-plus/primitives/dom';

import type { MaybeRefOrGetter, Ref } from 'vue';

/**
 * 焦点陷阱配置。
 */
interface UseFocusTrapOptions {
  /** 陷阱是否启用；关闭时立即移除全局监听。 */
  active: MaybeRefOrGetter<boolean>;

  /**
   * 焦点允许停留的容器。
   *
   * 容器本身必须可聚焦（通常由 UI 层设置 tabindex="-1"），
   * 用于没有任何可 Tab 元素时承接焦点。
   */
  container: Ref<HTMLElement | null>;
}

/**
 * 已激活的陷阱栈。
 *
 * 嵌套对话框会各自激活一个陷阱；只有栈顶实例响应键盘与 focusin，
 * 否则父子两个陷阱会把同一份焦点来回争抢。
 */
const trapStack: symbol[] = [];

/**
 * 聚焦目标；目标实际不可聚焦时退回容器，保证焦点不留在背景内容上。
 */
function focusWithin(container: HTMLElement, target: HTMLElement): void {
  target.focus({ preventScroll: true });

  if (!container.contains(document.activeElement)) {
    container.focus({ preventScroll: true });
  }
}

/**
 * Dialog 的焦点陷阱。
 *
 * 打开期间把 Tab 循环限制在内容容器内，并在程序化 focus 落到容器外时把焦点收回。
 * 关闭、容器卸载或作用域销毁时移除全部监听，不会影响之后的普通页面导航。
 *
 * @param options 陷阱启用状态与焦点容器。
 */
export function useFocusTrap(options: UseFocusTrapOptions): void {
  const token = Symbol('focus-trap');

  let isActive = false;

  function isTopmost(): boolean {
    return trapStack[trapStack.length - 1] === token;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.key !== 'Tab') return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!isTopmost()) return;

    const container = options.container.value;

    if (!container?.isConnected) return;

    const tabbables = getTabbableCandidates(container);

    if (tabbables.length === 0) {
      event.preventDefault();
      container.focus({ preventScroll: true });

      return;
    }

    const first = tabbables[0];
    const last = tabbables[tabbables.length - 1];
    const current = document.activeElement;

    if (!(current instanceof HTMLElement) || !container.contains(current)) {
      event.preventDefault();
      focusWithin(container, event.shiftKey ? last : first);

      return;
    }

    // Radix 同级的近似判断：容器/首项都算环的起点。焦点若停在 tabindex=-1 的
    // 程序化元素上，反向 Tab 可能先短暂跳出容器，但紧接着的 focusin 会把它收回。
    const atStart = current === container || current === first;

    if (event.shiftKey && atStart) {
      event.preventDefault();
      focusWithin(container, last);

      return;
    }

    if (!event.shiftKey && current === last) {
      event.preventDefault();
      focusWithin(container, first);
    }
  }

  function handleFocusIn(event: FocusEvent): void {
    if (!isTopmost()) return;

    const container = options.container.value;

    if (!container?.isConnected) return;

    const target = event.target;

    if (target instanceof Node && container.contains(target)) return;

    const tabbables = getTabbableCandidates(container);

    focusWithin(container, tabbables[0] ?? container);
  }

  function activate(): void {
    if (isActive) return;

    isActive = true;
    trapStack.push(token);

    // keydown 走冒泡阶段：子组件先处理 Tab，再由陷阱在边界兜底。
    document.addEventListener('keydown', handleKeydown);

    // focusin 用捕获阶段，程序化 focus 逃逸也会被立即收回。
    document.addEventListener('focusin', handleFocusIn, true);
  }

  function deactivate(): void {
    if (!isActive) return;

    isActive = false;

    const index = trapStack.indexOf(token);

    if (index !== -1) trapStack.splice(index, 1);

    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('focusin', handleFocusIn, true);
  }

  watch(
    [() => toValue(options.active), options.container],
    ([active, container]) => {
      if (active && container) {
        activate();

        return;
      }

      deactivate();
    },
    { immediate: true, flush: 'post' }
  );

  onScopeDispose(deactivate);
}
