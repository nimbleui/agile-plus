import { computed, onScopeDispose, ref, toValue, useId, watch } from 'vue';

import {
  DEFAULT_TOOLTIP_DELAY,
  DEFAULT_TOOLTIP_SKIP_DELAY,
  getGraceAreaPolygon,
  getTooltipDataState,
  isPointInPolygon,
  parsePlacement,
  resolveOpenDelay,
} from '@agile-plus/primitives';

import { useControllable } from '../utils/useControllable';
import { useFloating } from '../useFloating';

import type { TooltipPoint } from '@agile-plus/primitives';

import type { UseTooltipOptions, UseTooltipReturn } from './types';

/**
 * Tooltip 的 Vue 适配。
 *
 * 三块职责：**延迟开合**、**hover/focus 双触发**、**指针容差区**，定位全部交给 useFloating。
 *
 * 容差区的关键取舍：多边形在指针离开触发元素的那一刻**量一次并缓存**，之后的 pointermove
 * 只做纯几何判定，不再读布局。pointermove 是高频事件，逐次读两个矩形会造成不必要的布局读取；
 * 而容差区存续期间两个元素都不移动（滚动会让它失效，这是与 Radix 相同的已知边界）。
 *
 * 跳过延迟目前是**实例级**的：同一触发元素短时间内重新悬停会立即打开。跨触发元素共享
 * 时间窗需要 Provider，本版本刻意不做，等多提示场景真实出现再加。
 */
export function useTooltip(options: UseTooltipOptions = {}): UseTooltipReturn {
  const uid = useId();
  const contentId = `tooltip-${uid}`;

  const state = useControllable<boolean>({
    value: () => toValue(options.open),
    defaultValue: options.defaultOpen ?? false,
    onChange: (value) => options.onOpenChange?.(value),
  });

  const isOpen = state.value;
  const isInstant = ref(false);
  const lastClosedAt = ref<number | null>(null);

  const dataState = computed(() => getTooltipDataState(isOpen.value, isInstant.value));

  const floating = useFloating({
    placement: options.placement ?? 'top',
    offset: options.offset ?? 8,
    flip: options.flip,
    shift: options.shift,
    padding: options.padding,
    strategy: options.strategy,
    arrow: options.arrow,
    open: isOpen,
  });

  let openTimer: ReturnType<typeof setTimeout> | null = null;

  /** 缓存的容差区多边形；null 表示当前没有跟踪指针。 */
  let gracePolygon: TooltipPoint[] | null = null;

  function clearOpenTimer(): void {
    if (openTimer === null) return;

    clearTimeout(openTimer);
    openTimer = null;
  }

  function handleDocumentPointerMove(event: PointerEvent): void {
    if (!gracePolygon) return;

    // 纯判定，不读布局：多边形已在建立时量好。
    if (!isPointInPolygon({ x: event.clientX, y: event.clientY }, gracePolygon)) close();
  }

  function detachGrace(): void {
    if (!gracePolygon) return;

    gracePolygon = null;

    if (typeof document !== 'undefined') {
      document.removeEventListener('pointermove', handleDocumentPointerMove);
    }
  }

  /**
   * 建立容差区：一次性量取两个矩形，算出多边形后挂 document 监听。
   *
   * 量不到元素（内容还没渲染）时直接关闭，而不是留一个永远命中不了的监听。
   */
  function attachGrace(): void {
    const reference = floating.referenceRef.value;
    const content = floating.floatingRef.value;

    if (!reference || !content || typeof document === 'undefined') {
      close();

      return;
    }

    gracePolygon = getGraceAreaPolygon(
      reference.getBoundingClientRect(),
      content.getBoundingClientRect(),
      parsePlacement(floating.placement.value).side
    );

    document.addEventListener('pointermove', handleDocumentPointerMove);
  }

  function handleOpen(instant: boolean): void {
    isInstant.value = instant;
    state.set(true);
  }

  function open(): void {
    clearOpenTimer();
    handleOpen(true);
  }

  function close(): void {
    clearOpenTimer();
    detachGrace();

    if (isOpen.value) lastClosedAt.value = Date.now();

    state.set(false);
  }

  function onTriggerPointerEnter(): void {
    clearOpenTimer();

    const delay = resolveOpenDelay({
      delayDuration: toValue(options.delayDuration) ?? DEFAULT_TOOLTIP_DELAY,
      skipDelayDuration: toValue(options.skipDelayDuration) ?? DEFAULT_TOOLTIP_SKIP_DELAY,
      lastClosedAt: lastClosedAt.value,
      now: Date.now(),
    });

    if (delay === 0) {
      handleOpen(true);

      return;
    }

    openTimer = setTimeout(() => {
      openTimer = null;

      handleOpen(false);
    }, delay);
  }

  function onTriggerPointerLeave(): void {
    clearOpenTimer();

    if (!isOpen.value) return;

    if (toValue(options.disableHoverableContent) === true) {
      close();

      return;
    }

    attachGrace();
  }

  /** 焦点触发立即打开：键盘用户已经明确停在这个元素上，再等 700ms 只是迟钝。 */
  function onTriggerFocus(): void {
    clearOpenTimer();
    handleOpen(true);
  }

  function onTriggerBlur(): void {
    close();
  }

  function onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;

    close();
  }

  /** 指针进入内容：取消容差跟踪，此后由内容自己的 leave 决定关闭。 */
  function onContentPointerEnter(): void {
    clearOpenTimer();
    detachGrace();
  }

  function onContentPointerLeave(): void {
    close();
  }

  function getTriggerProps(): Record<string, unknown> {
    return {
      // 只在打开时关联：关闭时指向一个不存在的 id 会让读屏念出空引用。
      'aria-describedby': isOpen.value ? contentId : undefined,
      'data-state': dataState.value,
    };
  }

  function getContentProps(): Record<string, unknown> {
    return {
      id: contentId,
      role: 'tooltip',
      'data-state': dataState.value,
    };
  }

  // 受控模式下外部把值改回 false 时，计时与容差跟踪也要一起停。
  watch(isOpen, (open) => {
    if (open) return;

    clearOpenTimer();
    detachGrace();
  });

  onScopeDispose(() => {
    clearOpenTimer();
    detachGrace();
  });

  return {
    isOpen,
    open,
    close,
    dataState,
    contentId,
    floating,
    getTriggerProps,
    getContentProps,
    onTriggerPointerEnter,
    onTriggerPointerLeave,
    onTriggerFocus,
    onTriggerBlur,
    onTriggerKeydown,
    onContentPointerEnter,
    onContentPointerLeave,
  };
}
