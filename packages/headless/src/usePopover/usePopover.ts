import { nextTick, onScopeDispose, toValue, useId, watch } from 'vue';

import { useControllable } from '../utils/useControllable';
import { isBrowser } from '../utils/env';
import { useFloating } from '../useFloating';

import type { UsePopoverOptions, UsePopoverReturn } from './types';

/**
 * Popover 的 Vue 适配。
 *
 * 非模态浮层：不锁滚动、不做焦点陷阱；打开时由 UI 层把焦点移进浮层，关闭时若焦点
 * 曾在浮层内则交还触发元素。外部指针按下与 Escape 关闭。
 *
 * 内容**懒渲染**：UI 层用 usePresence 的 v-if 驱动，关闭即卸载，打开才挂载；本层只
 * 持有开合状态与定位，不持有内容 DOM。
 */
export function usePopover(options: UsePopoverOptions = {}): UsePopoverReturn {
  const uid = useId();
  const triggerId = `popover-trigger-${uid}`;
  const contentId = `popover-content-${uid}`;

  const state = useControllable<boolean>({
    value: () => toValue(options.open),
    defaultValue: options.defaultOpen ?? false,
    onChange: (next) => options.onOpenChange?.(next),
  });

  const isOpen = state.value;

  const floating = useFloating({
    placement: options.placement ?? 'bottom',
    offset: options.offset ?? 8,
    flip: options.flip,
    shift: options.shift,
    padding: options.padding ?? 8,
    strategy: options.strategy,
    arrow: options.arrow ?? { size: 8 },
    open: isOpen,
  });

  function open(): void {
    state.set(true);
  }

  function close(): void {
    const content = floating.floatingRef.value;
    const active = isBrowser ? document.activeElement : null;

    state.set(false);

    // 焦点曾在浮层内才交还触发元素；外部点击关闭时不抢焦点。
    if (content && active instanceof Node && content.contains(active)) {
      floating.referenceRef.value?.focus();
    }
  }

  function toggle(): void {
    if (isOpen.value) close();
    else open();
  }

  function onContentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;

    if (options.closeOnEscape === false) return;

    event.preventDefault();
    close();
  }

  function getTriggerProps(): Record<string, unknown> {
    return {
      id: triggerId,
      'aria-haspopup': 'dialog',
      'aria-expanded': isOpen.value,
      'aria-controls': isOpen.value ? contentId : undefined,
      'data-state': isOpen.value ? 'open' : 'closed',
    };
  }

  function getContentProps(): Record<string, unknown> {
    return {
      id: contentId,
      role: 'dialog',
      'aria-labelledby': triggerId,
      tabindex: -1,
      'data-state': isOpen.value ? 'open' : 'closed',
    };
  }

  function getCloseProps(): Record<string, unknown> {
    return { type: 'button' };
  }

  function setTriggerElement(node: unknown): void {
    floating.referenceRef.value = node instanceof HTMLElement ? node : null;
  }

  function setContentElement(node: unknown): void {
    floating.floatingRef.value = node instanceof HTMLElement ? node : null;
  }

  function handleDocumentPointerDown(event: PointerEvent): void {
    const target = event.target;

    if (!(target instanceof Node)) return;

    const trigger = floating.referenceRef.value;
    const content = floating.floatingRef.value;

    if (trigger?.contains(target) || content?.contains(target)) return;

    close();
  }

  watch(
    isOpen,
    (open) => {
      if (!isBrowser) return;

      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);

      if (open) {
        document.addEventListener('pointerdown', handleDocumentPointerDown, true);

        // 打开后焦点移进浮层（非模态）；懒渲染下内容下一拍才挂载，等 nextTick。
        // 必须 preventScroll：此刻 rAF 测量还没把浮层挪到正确坐标，元素首帧停在文档
        // 原点，默认 focus 会把它滚进视口，表现为页面滚到顶部。
        void nextTick(() => {
          floating.floatingRef.value?.focus({ preventScroll: true });
        });
      }
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    if (isBrowser) document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  });

  return {
    isOpen,
    open,
    close,
    toggle,
    triggerId,
    contentId,
    floating,
    getTriggerProps,
    getContentProps,
    getCloseProps,
    setTriggerElement,
    setContentElement,
    onContentKeydown,
  };
}
