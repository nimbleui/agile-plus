import { computed, onScopeDispose, ref, toValue, watch } from 'vue';

import {
  getEllipsisClampStyle,
  getEllipsisDataState,
  getEllipsisTailStyle,
  getEllipsisWrapperStyle,
  resolveEllipsisLines,
  resolveEllipsisOverflow,
  splitMiddleEllipsis,
} from '@agile-plus/primitives/ellipsis';

import { useControllable } from '../utils/useControllable';
import { useResizeObserver } from '../utils/useResizeObserver';
import { isBrowser } from '../utils/env';

import type { CSSProperties } from 'vue';

import type { EllipsisMode } from '@agile-plus/primitives/ellipsis';

import type { UseEllipsisOptions, UseEllipsisReturn } from './types';

/**
 * 文本省略的 Vue 适配。
 *
 * 三块职责：**溢出测量**（ResizeObserver + 文本/模式变化重测）、**展开态**（受控/非受控）、
 * **功能性样式**（截断是行为不是装饰，由本层产出供无样式层直接绑定）。
 *
 * 测量遵循「统一读取 → 纯计算 → 统一写入」：一次读齐 scrollWidth / clientWidth /
 * scrollHeight / clientHeight，交给 primitives 判定，再写响应式状态；resize 回调经
 * rAF 合并，同一帧不重复量。
 *
 * 溢出判定是 sticky 的：展开后不再重判（展开态恒不溢出），但保留展开前的 true，
 * 否则「收起」按钮会在展开那一刻消失，用户就收不回去了。文本 / 模式 / 行数变化时
 * 先清零再重测，避免旧文本的溢出结论套到新文本上。
 */
export function useEllipsis(options: UseEllipsisOptions = {}): UseEllipsisReturn {
  const mode = computed<EllipsisMode>(() => toValue(options.mode) ?? 'single');
  const lines = computed(() => resolveEllipsisLines(mode.value, toValue(options.lines)));

  const expandedState = useControllable<boolean>({
    value: () => toValue(options.expanded),
    defaultValue: options.defaultExpanded ?? false,
    onChange: (next) => options.onExpandedChange?.(next),
  });

  const expanded = expandedState.value;
  const isOverflow = ref(false);
  const textSource = ref('');

  const contentElement = ref<HTMLElement | null>(null);

  const tailText = computed(
    () =>
      splitMiddleEllipsis({ text: textSource.value, tailChars: toValue(options.tailChars) }).tail
  );

  const dataState = computed(() =>
    getEllipsisDataState({ overflow: isOverflow.value, expanded: expanded.value })
  );

  const contentStyle = computed<CSSProperties>(
    () => getEllipsisClampStyle(mode.value, lines.value, expanded.value) as CSSProperties
  );

  const wrapperStyle = computed<CSSProperties>(
    () => getEllipsisWrapperStyle(mode.value, expanded.value) as CSSProperties
  );

  const tailStyle = computed<CSSProperties>(() => getEllipsisTailStyle() as CSSProperties);

  let frame: number | null = null;

  const resize = useResizeObserver(requestMeasure);

  /** 一次读取阶段量齐四个读数，交给纯函数判定，再写状态。 */
  function measureNow(): void {
    const element = contentElement.value;

    if (!element || !isBrowser) return;

    const overflow = resolveEllipsisOverflow({
      mode: mode.value,
      expanded: expanded.value,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    });

    // 展开态不写：保留展开前的 sticky 结论，收起按钮才还在。
    if (!expanded.value && isOverflow.value !== overflow) isOverflow.value = overflow;
  }

  /** 合并同一帧内的多次测量请求。 */
  function requestMeasure(): void {
    if (!isBrowser || frame !== null) return;

    frame = window.requestAnimationFrame(() => {
      frame = null;

      measureNow();
    });
  }

  function setContentElement(node: unknown): void {
    const next = node instanceof HTMLElement ? node : null;

    if (contentElement.value === next) return;

    contentElement.value = next;
    resize.disconnect();

    if (!next) return;

    resize.observe(next);
    requestMeasure();
  }

  function setText(text: string): void {
    if (textSource.value === text) return;

    textSource.value = text;
    requestMeasure();
  }

  function setExpanded(next: boolean): void {
    expandedState.set(next);
  }

  function toggleExpanded(): void {
    setExpanded(!expanded.value);
  }

  // 模式 / 行数 / 尾部保留数变化：旧结论作废，清零后重测。
  watch([mode, lines, () => toValue(options.tailChars)], () => {
    isOverflow.value = false;
    requestMeasure();
  });

  // 展开 / 收起切换后重测：收起时要重新得出是否溢出。
  watch(expanded, () => requestMeasure());

  onScopeDispose(() => {
    resize.disconnect();

    if (frame !== null && isBrowser) {
      window.cancelAnimationFrame(frame);
      frame = null;
    }
  });

  return {
    mode,
    lines,
    isOverflow: computed(() => isOverflow.value),
    expanded,
    dataState,
    tailText,
    contentStyle,
    wrapperStyle,
    tailStyle,
    toggleExpanded,
    setExpanded,
    setContentElement,
    setText,
    measure: requestMeasure,
  };
}
