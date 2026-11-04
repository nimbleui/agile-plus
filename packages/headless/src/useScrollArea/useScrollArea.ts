import { computed, onScopeDispose, ref, toValue, watch } from 'vue';

import {
  clampThumbOffset,
  getScrollOffsetFromThumb,
  getThumbMetrics,
  resolveScrollbarVisibility,
} from '@agile-plus/primitives/scroll-area';

import { isBrowser, isObserverAvailable } from '../utils/env';
import { usePointerDrag } from '../utils/usePointerDrag';
import { useResizeObserver } from '../utils/useResizeObserver';

import type { CSSProperties } from 'vue';

import type {
  ScrollAreaOrientation,
  ScrollAreaType,
  ScrollbarVisibility,
  ThumbMetrics,
} from '@agile-plus/primitives/scroll-area';

import type { UseScrollAreaOptions, UseScrollAreaReturn } from './types';

/** Radix 的默认出现时机。 */
const DEFAULT_TYPE: ScrollAreaType = 'hover';

/** Radix 的默认隐藏延迟（毫秒）。 */
const DEFAULT_SCROLL_HIDE_DELAY = 600;

/** 尚未测量时的占位结果，保证首帧不会渲染出 NaN 尺寸。 */
const EMPTY_METRICS: ThumbMetrics = { size: 0, offset: 0, hasOverflow: false };

/**
 * ScrollArea 的 Vue Composable 适配。
 *
 * 职责边界：几何与可见性判断全部委托给 primitives，本层只做三件事——把 DOM 读成
 * 像素快照、把高频事件合并到一帧、把指针与焦点事件归一化成布尔输入。
 *
 * @param options Composable 配置选项。
 * @returns 各部件需要的属性、样式与事件处理器。
 */
export function useScrollArea(options: UseScrollAreaOptions = {}): UseScrollAreaReturn {
  const { scrollHideDelay = DEFAULT_SCROLL_HIDE_DELAY, minThumbSize } = options;

  const viewportRef = ref<HTMLElement | null>(null);

  /**
   * 测量代号：几何结果由它驱动重算。
   *
   * computed 读取 DOM 不会自动追踪布局变化，没有这个显式版本就会一直拿缓存值，
   * 表现为滚动后 thumb 不动。
   */
  const measureVersion = ref(0);

  const hoveringViewport = ref(false);
  const focusingViewport = ref(false);
  const hoveringScrollbar = ref<Record<ScrollAreaOrientation, boolean>>({
    vertical: false,
    horizontal: false,
  });
  const draggingOrientation = ref<ScrollAreaOrientation | null>(null);
  const recentlyScrolled = ref(false);

  const type = computed(() => toValue(options.type) ?? DEFAULT_TYPE);

  let measureFrame: number | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let mutationObserver: MutationObserver | null = null;

  // 溢出与 thumb 尺寸都由元素尺寸变化推导，观察回调只需要一次合并测量。
  const resize = useResizeObserver(requestMeasure);

  /** 拖拽监听的生命周期由它统一登记与释放；同一时刻最多只有一个方向在被拖拽。 */
  const drag = usePointerDrag();

  /**
   * 合并同一帧内的多次测量请求。
   *
   * scroll 与 resize 都是高频事件，逐次读布局会造成强制同步布局；这里保证一帧
   * 一次，并把「推进版本」与「读取 DOM」分开，避免读写交错。
   */
  function requestMeasure(): void {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return;
    }

    if (measureFrame !== null) return;

    measureFrame = window.requestAnimationFrame(() => {
      measureFrame = null;
      measureVersion.value += 1;
    });
  }

  function readTrack(orientation: ScrollAreaOrientation) {
    const el = viewportRef.value;

    if (!el) return { viewportSize: 0, scrollSize: 0, scrollOffset: 0 };

    return orientation === 'vertical'
      ? {
          viewportSize: el.clientHeight,
          scrollSize: el.scrollHeight,
          scrollOffset: el.scrollTop,
        }
      : {
          viewportSize: el.clientWidth,
          scrollSize: el.scrollWidth,
          scrollOffset: el.scrollLeft,
        };
  }

  function measureMetrics(orientation: ScrollAreaOrientation): ThumbMetrics {
    const { viewportSize, scrollSize, scrollOffset } = readTrack(orientation);

    return getThumbMetrics({ viewportSize, scrollSize, scrollOffset, minThumbSize });
  }

  /** 依赖 measureVersion 触发重算，否则 Vue 会把它当成纯派生值永久缓存。 */
  const verticalMetrics = computed(() => {
    void measureVersion.value;

    return typeof window === 'undefined' ? EMPTY_METRICS : measureMetrics('vertical');
  });

  const horizontalMetrics = computed(() => {
    void measureVersion.value;

    return typeof window === 'undefined' ? EMPTY_METRICS : measureMetrics('horizontal');
  });

  function getMetrics(orientation: ScrollAreaOrientation): ThumbMetrics {
    return orientation === 'vertical' ? verticalMetrics.value : horizontalMetrics.value;
  }

  function markRecentlyScrolled(): void {
    recentlyScrolled.value = true;

    if (hideTimer !== null) clearTimeout(hideTimer);

    hideTimer = setTimeout(() => {
      hideTimer = null;
      recentlyScrolled.value = false;
    }, scrollHideDelay);
  }

  function getVisibility(orientation: ScrollAreaOrientation): ScrollbarVisibility {
    const metrics = getMetrics(orientation);

    return resolveScrollbarVisibility(
      {
        interacting:
          hoveringViewport.value || focusingViewport.value || hoveringScrollbar.value[orientation],
        dragging: draggingOrientation.value === orientation,
        recentlyScrolled: recentlyScrolled.value,
        hasOverflow: metrics.hasOverflow,
      },
      type.value
    );
  }

  function getRootProps(): Record<string, unknown> {
    return { dir: toValue(options.dir) || undefined };
  }

  /**
   * 视口带 tabindex。
   *
   * 自定义滚动条把原生滚动条隐藏后，键盘用户没有任何方式滚动内容；APG 对可滚动
   * 容器的要求正是让它可聚焦。Radix 未做这件事，本库的这一点差异记录在文档里。
   */
  function getViewportProps(): Record<string, unknown> {
    return { tabindex: 0 };
  }

  function getScrollbarProps(orientation: ScrollAreaOrientation): Record<string, unknown> {
    return {
      'data-orientation': orientation,
      'data-state': getVisibility(orientation),
    };
  }

  function getThumbProps(orientation: ScrollAreaOrientation): Record<string, unknown> {
    return {
      'data-state': getVisibility(orientation),
      'data-orientation': orientation,
    };
  }

  function getThumbStyle(orientation: ScrollAreaOrientation): CSSProperties {
    const metrics = getMetrics(orientation);

    // 位移用 transform 而不是 top / left，避免每次滚动都触发布局。
    return orientation === 'vertical'
      ? { height: `${metrics.size}px`, transform: `translateY(${metrics.offset}px)` }
      : { width: `${metrics.size}px`, transform: `translateX(${metrics.offset}px)` };
  }

  const isCornerVisible = computed(
    () => getVisibility('vertical') === 'visible' && getVisibility('horizontal') === 'visible'
  );

  function getCornerProps(): Record<string, unknown> {
    return { 'data-state': isCornerVisible.value ? 'visible' : 'hidden' };
  }

  function onViewportScroll(): void {
    markRecentlyScrolled();

    requestMeasure();
  }

  function onViewportPointerEnter(): void {
    hoveringViewport.value = true;
  }

  function onViewportPointerLeave(): void {
    hoveringViewport.value = false;
  }

  function onViewportFocusin(): void {
    focusingViewport.value = true;
  }

  function onViewportFocusout(): void {
    focusingViewport.value = false;
  }

  function onScrollbarPointerEnter(orientation: ScrollAreaOrientation): void {
    hoveringScrollbar.value = { ...hoveringScrollbar.value, [orientation]: true };
  }

  function onScrollbarPointerLeave(orientation: ScrollAreaOrientation): void {
    hoveringScrollbar.value = { ...hoveringScrollbar.value, [orientation]: false };
  }

  /**
   * 按下 thumb 后接管指针。
   *
   * 监听挂在 window 而不是 thumb：指针移出滚动条后仍能继续拖拽，也不需要
   * setPointerCapture —— 它在合成指针事件下会抛 InvalidStateError。
   * 清理集中在 disposeDrag：pointerup、pointercancel 与组件卸载走同一条路径，
   * 否则异常中断会把 dragging 永远留在 true、滚动条再也不会隐藏。
   */
  function onThumbPointerDown(event: PointerEvent, orientation: ScrollAreaOrientation): void {
    const el = viewportRef.value;

    if (!el || typeof window === 'undefined') return;

    const metrics = getMetrics(orientation);

    if (!metrics.hasOverflow) return;

    const { viewportSize, scrollSize } = readTrack(orientation);
    const startPointer = orientation === 'vertical' ? event.clientY : event.clientX;
    const startOffset = metrics.offset;

    draggingOrientation.value = orientation;
    event.preventDefault();

    drag.start({
      onMove: (moveEvent: PointerEvent): void => {
        const currentPointer = orientation === 'vertical' ? moveEvent.clientY : moveEvent.clientX;
        const nextOffset = clampThumbOffset(
          startOffset + (currentPointer - startPointer),
          viewportSize,
          metrics.size
        );
        const scrollOffset = getScrollOffsetFromThumb({
          thumbOffset: nextOffset,
          viewportSize,
          scrollSize,
          thumbSize: metrics.size,
        });

        // 只写滚动位置；thumb 的新位置由 scroll 事件走同一套测量得到，避免两套真源。
        if (orientation === 'vertical') {
          el.scrollTop = scrollOffset;
        } else {
          el.scrollLeft = scrollOffset;
        }
      },
      onEnd: () => {
        draggingOrientation.value = null;
      },
    });
  }

  /**
   * 观察视口与内容两个目标的尺寸变化。
   *
   * 只读不写视口尺寸（写的是视口之外滚动条上的 transform），因此不会形成
   * 「观察 → 改尺寸 → 再触发」的回调循环。
   */
  function observeTargets(el: HTMLElement): void {
    resize.observe(el);

    if (el.firstElementChild instanceof HTMLElement) resize.observe(el.firstElementChild);
  }

  function detachObservers(): void {
    resize.disconnect();
    mutationObserver?.disconnect();
    mutationObserver = null;
  }

  watch(viewportRef, (el) => {
    detachObservers();

    if (!el || !isObserverAvailable(globalThis.ResizeObserver)) return;

    observeTargets(el);

    // 内容子元素被整体替换时旧观察目标失效，需要重新挂载。
    if (isObserverAvailable(globalThis.MutationObserver)) {
      mutationObserver = new MutationObserver(() => {
        observeTargets(el);
        requestMeasure();
      });

      mutationObserver.observe(el, { childList: true });
    }

    requestMeasure();
  });

  onScopeDispose(() => {
    detachObservers();

    if (measureFrame !== null && isBrowser) {
      window.cancelAnimationFrame(measureFrame);
      measureFrame = null;
    }

    if (hideTimer !== null) clearTimeout(hideTimer);
  });

  return {
    viewportRef,
    type,
    requestMeasure,
    getRootProps,
    getViewportProps,
    getScrollbarProps,
    getThumbProps,
    getThumbStyle,
    getCornerProps,
    isCornerVisible,
    getVisibility,
    onViewportScroll,
    onViewportPointerEnter,
    onViewportPointerLeave,
    onViewportFocusin,
    onViewportFocusout,
    onScrollbarPointerEnter,
    onScrollbarPointerLeave,
    onThumbPointerDown,
  };
}
