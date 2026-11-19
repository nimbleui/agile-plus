import { computed, onScopeDispose, ref, toValue, useId, watch } from 'vue';

import {
  addMonths,
  emptyRangeDraft,
  formatDate,
  getCalendarGrid,
  getRangeHighlight,
  getWeekdayLabels,
  isSameDay,
  isSameMonth,
  parseDate,
  resolveDateMove,
  resolveDatePickerKeyIntent,
  resolveRangePick,
  startOfDay,
} from '@agile-plus/primitives/date';

import { useControllable } from '../utils/useControllable';
import { isBrowser } from '../utils/env';
import { useFloating } from '../useFloating';

import type { CSSProperties } from 'vue';

import type {
  DateCell,
  DateMove,
  DateRangeCellState,
  DateRangeDraft,
} from '@agile-plus/primitives/date';

import type {
  DateRangeSide,
  DateRangeViewUnit,
  UseDateRangePickerOptions,
  UseDateRangePickerReturn,
} from './types';

/** 面板与控件之间的缺省间距，与单选 DatePicker 一致。 */
const DEFAULT_OFFSET = 4;

/** 面板与视口边缘的缺省留白。 */
const DEFAULT_PADDING = 8;

const DEFAULT_VALUE_FORMAT = 'YYYY-MM-DD';

const DEFAULT_FIRST_DAY_OF_WEEK = 1;

const DAYS_PER_WEEK = 7;

/**
 * DateRangePicker 的 Vue 适配。
 *
 * 与单选 DatePicker 共享同一套日历 / 格式 / 按键原语，差异集中在三处：
 * **两个端点**（值与输入草稿都是二元组）、**活跃端**（点选与键盘落在哪一端）、
 * **悬停预览**（等待终点时起点 + 悬停日期构成预览范围）。
 *
 * 焦点模型不变：焦点始终留在活跃输入框上，面板用 aria-activedescendant 指向
 * 焦点格。左右两月网格含相同的补齐日期，格子 id 带 side 才唯一；键盘焦点恒在
 * 左面板（焦点跨月时左面板跟着翻），右面板只做指针选择。
 *
 * 点选流程：起点端记录起点并切到终点端；终点端早于起点时交换两端；两端确定
 * 即提交并关闭。未完成时外部点击 / Escape 丢弃草稿，已输入文本按 blur 规则提交。
 */
export function useDateRangePicker(
  options: UseDateRangePickerOptions = {}
): UseDateRangePickerReturn {
  const uid = useId();
  const triggerIds = [`date-range-trigger-${uid}-0`, `date-range-trigger-${uid}-1`];
  const contentId = `date-range-content-${uid}`;

  const valueFormat = options.valueFormat ?? DEFAULT_VALUE_FORMAT;
  const format = options.format ?? DEFAULT_VALUE_FORMAT;

  const valueState = useControllable<[string, string] | null>({
    value: () => toValue(options.modelValue),
    defaultValue: options.defaultValue ?? null,
    onChange: (next) => options.onValueChange?.(next),
  });

  const openState = useControllable<boolean>({
    value: () => toValue(options.open),
    defaultValue: options.defaultOpen ?? false,
    onChange: (next) => options.onOpenChange?.(next),
  });

  const value = valueState.value;
  const isOpen = openState.value;

  const isDisabled = computed(() => toValue(options.disabled) === true);

  const firstDayOfWeek = computed(() => {
    const raw = toValue(options.firstDayOfWeek) ?? DEFAULT_FIRST_DAY_OF_WEEK;

    return ((raw % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  });

  const selectedRange = computed<[Date, Date] | null>(() => {
    const current = value.value;

    if (!current) return null;

    const start = parseDate(current[0], valueFormat);
    const end = parseDate(current[1], valueFormat);

    return start && end ? [start, end] : null;
  });

  const activeIndex = ref<0 | 1>(0);
  const draftRange = ref<DateRangeDraft>(emptyRangeDraft());
  const inputDrafts = ref<[string | null, string | null]>([null, null]);
  const hoverDate = ref<Date | null>(null);

  // 草稿来源标记：输入提交的待定端点按 blur 语义在关闭后保留（等另一端补齐），
  // 点选草稿在关闭时丢弃。Escape 强制丢弃两者。
  let draftIsTyped = false;

  const initialBase = selectedRange.value?.[0] ?? new Date();

  const panelDate = ref(startOfMonth(initialBase));
  const focusedDate = ref(startOfDay(initialBase));

  const triggerElements: [HTMLElement | null, HTMLElement | null] = [null, null];

  // close() 交还焦点会再触发一次 focus；不拦掉它，Escape 关闭会立刻重新打开。
  let skipFocusOpen = false;

  const floating = useFloating({
    placement: options.placement ?? 'bottom-start',
    offset: options.offset ?? DEFAULT_OFFSET,
    flip: options.flip,
    shift: options.shift,
    padding: options.padding ?? DEFAULT_PADDING,
    strategy: options.strategy,
    open: isOpen,
  });

  const rightPanelDate = computed(() => addMonths(panelDate.value, 1));

  const awaitingEnd = computed(() => draftRange.value[0] !== null && draftRange.value[1] === null);

  const displayTexts = computed<[string, string]>(() => {
    const picking = draftRange.value[0] !== null;
    const committed = selectedRange.value;

    function text(index: 0 | 1): string {
      const draft = inputDrafts.value[index];

      if (draft !== null) return draft;

      // 选值进行中回显草稿而不是旧提交值：开始新一轮选择时终点输入框应当清空。
      if (picking) {
        const pending = draftRange.value[index];

        return pending ? formatDate(pending, format) : '';
      }

      return committed ? formatDate(committed[index], format) : '';
    }

    return [text(0), text(1)];
  });

  const leftCells = computed<DateCell[]>(() =>
    getCalendarGrid({
      year: panelDate.value.getFullYear(),
      month: panelDate.value.getMonth(),
      firstDayOfWeek: firstDayOfWeek.value,
    })
  );

  const rightCells = computed<DateCell[]>(() =>
    getCalendarGrid({
      year: rightPanelDate.value.getFullYear(),
      month: rightPanelDate.value.getMonth(),
      firstDayOfWeek: firstDayOfWeek.value,
    })
  );

  const weekdayLabels = computed(() => getWeekdayLabels(firstDayOfWeek.value));

  function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function isDateDisabled(date: Date): boolean {
    if (isDisabled.value) return true;

    return options.disabledDate ? options.disabledDate(startOfDay(date)) : false;
  }

  function getCellState(date: Date, side: DateRangeSide): DateRangeCellState {
    const picking = draftRange.value[0] !== null;
    const committed = selectedRange.value;

    const start = picking ? draftRange.value[0] : (committed?.[0] ?? null);
    const end = picking ? draftRange.value[1] : (committed?.[1] ?? null);
    const hover = awaitingEnd.value ? hoverDate.value : null;

    const highlight = getRangeHighlight({ date, start, end, hover });
    const monthAnchor = side === 'left' ? panelDate.value : rightPanelDate.value;

    return {
      selected: highlight.isStart || highlight.isEnd,
      disabled: isDateDisabled(date),
      today: isSameDay(new Date(), date),
      inMonth: isSameMonth(monthAnchor, date),
      ...highlight,
    };
  }

  function getCellId(date: Date, side: DateRangeSide): string {
    return `date-range-cell-${uid}-${side}-${formatDate(date, DEFAULT_VALUE_FORMAT)}`;
  }

  function open(initialActive: 0 | 1 = 0): void {
    if (isDisabled.value) return;

    // 输入提交的待定端点跨开合保留，用户重开面板可以接着补齐另一端。
    if (!draftIsTyped) draftRange.value = emptyRangeDraft();

    inputDrafts.value = [null, null];
    hoverDate.value = null;

    const base = draftRange.value[0] ?? selectedRange.value?.[0] ?? new Date();

    panelDate.value = startOfMonth(base);
    focusedDate.value = startOfDay(base);
    activeIndex.value = initialActive;
    openState.set(true);
  }

  function cleanupDrafts(): void {
    if (!draftIsTyped) draftRange.value = emptyRangeDraft();

    inputDrafts.value = [null, null];
    hoverDate.value = null;
  }

  function close(): void {
    const content = floating.floatingRef.value;
    const active = isBrowser ? document.activeElement : null;

    // 清理必须同步做：同一 tick 内 open→close 时 watch 的新旧值相同会被跳过。
    cleanupDrafts();
    openState.set(false);

    if (content && active instanceof Node && content.contains(active)) {
      skipFocusOpen = true;
      triggerElements[activeIndex.value]?.focus();
    }
  }

  function selectRange(start: Date, end: Date): void {
    if (isDisabled.value) return;

    const [orderedStart, orderedEnd] =
      start.getTime() <= end.getTime() ? [start, end] : [end, start];

    if (isDateDisabled(orderedStart) || isDateDisabled(orderedEnd)) return;

    draftRange.value = emptyRangeDraft();
    draftIsTyped = false;
    valueState.set([formatDate(orderedStart, valueFormat), formatDate(orderedEnd, valueFormat)]);
    close();
  }

  /** 预设快捷项入口：按 valueFormat 解析两端字符串，非法则静默忽略。 */
  function selectRangeByValue(start: string, end: string): void {
    const parsedStart = parseDate(start, valueFormat);
    const parsedEnd = parseDate(end, valueFormat);

    if (parsedStart && parsedEnd) selectRange(parsedStart, parsedEnd);
  }

  function pickDate(date: Date): void {
    if (isDateDisabled(date)) return;

    const result = resolveRangePick({ draft: draftRange.value, active: activeIndex.value, date });

    if (result.done && result.draft[0] && result.draft[1]) {
      selectRange(result.draft[0], result.draft[1]);

      return;
    }

    draftRange.value = result.draft;
    draftIsTyped = false;
    hoverDate.value = null;
    setActiveIndex(result.active);
  }

  function clear(): void {
    draftRange.value = emptyRangeDraft();
    draftIsTyped = false;
    inputDrafts.value = [null, null];
    hoverDate.value = null;
    valueState.set(null);
  }

  function setActiveIndex(index: 0 | 1): void {
    activeIndex.value = index;
    triggerElements[index]?.focus();
  }

  function shiftView(unit: DateRangeViewUnit, delta: -1 | 1): void {
    const months = unit === 'month' ? 1 : 12;

    panelDate.value = addMonths(panelDate.value, delta * months);
    focusedDate.value = addMonths(focusedDate.value, delta * months);
  }

  function moveFocus(move: DateMove): void {
    const next = resolveDateMove(focusedDate.value, move);

    focusedDate.value = next;
    panelDate.value = startOfMonth(next);
  }

  /**
   * 提交某一端的输入草稿。
   *
   * 另一端优先取草稿、其次取提交值；两端齐备即合成范围（自动排序）并关闭。
   * 只有一端时保留为待定草稿，等另一端输入或点选。非法文本静默回退。
   */
  function commitInput(index: 0 | 1): void {
    const text = inputDrafts.value[index];

    if (text === null) return;

    inputDrafts.value = index === 0 ? [null, inputDrafts.value[1]] : [inputDrafts.value[0], null];

    const trimmed = text.trim();

    if (trimmed === '') {
      clear();

      return;
    }

    const parsed = parseDate(trimmed, format);

    if (!parsed || isDateDisabled(parsed)) return;

    const other = draftRange.value[1 - index] ?? selectedRange.value?.[1 - index] ?? null;

    if (other) {
      selectRange(parsed, other);

      return;
    }

    draftRange.value = index === 0 ? [parsed, null] : [null, parsed];
    draftIsTyped = true;
  }

  function onInputInput(index: 0 | 1, event: Event): void {
    if (isDisabled.value) return;

    const target = event.target;

    if (!(target instanceof HTMLInputElement)) return;

    inputDrafts.value =
      index === 0 ? [target.value, inputDrafts.value[1]] : [inputDrafts.value[0], target.value];
  }

  function onInputBlur(index: 0 | 1): void {
    commitInput(index);
  }

  function onInputFocus(index: 0 | 1): void {
    if (skipFocusOpen) {
      skipFocusOpen = false;

      return;
    }

    activeIndex.value = index;

    if (!isDisabled.value && !isOpen.value) open(index);
  }

  function onInputClick(index: 0 | 1): void {
    if (!isDisabled.value && !isOpen.value) open(index);
  }

  function onInputKeydown(index: 0 | 1, event: KeyboardEvent): void {
    if (isDisabled.value) return;

    // Tab 在打开态先换端：起点→终点、Shift+Tab 终点→起点；再按才走出组件。
    if (event.key === 'Tab' && isOpen.value) {
      if (index === 0 && !event.shiftKey) {
        event.preventDefault();
        setActiveIndex(1);

        return;
      }

      if (index === 1 && event.shiftKey) {
        event.preventDefault();
        setActiveIndex(0);

        return;
      }

      close();

      return;
    }

    if (!isOpen.value && event.key === 'Enter' && inputDrafts.value[index] !== null) {
      event.preventDefault();
      commitInput(index);

      return;
    }

    const intent = resolveDatePickerKeyIntent({
      key: event.key,
      open: isOpen.value,
      panel: 'date',
      focusedDate: focusedDate.value,
      firstDayOfWeek: firstDayOfWeek.value,
      hasModifierKey: event.ctrlKey || event.altKey || event.metaKey,
    });

    if (intent.kind === 'none') return;

    if (intent.kind === 'tab-out') {
      close();

      return;
    }

    event.preventDefault();

    if (intent.kind === 'open') open(index);
    else if (intent.kind === 'close') {
      // Escape 是显式取消：输入草稿也一并丢弃，与 blur / 外部点击的保留语义相反。
      draftIsTyped = false;
      close();
    } else if (intent.kind === 'move') moveFocus(intent.move);
    else if (intent.kind === 'commit') pickDate(focusedDate.value);
  }

  function onCellPointerDown(event: PointerEvent): void {
    event.preventDefault();
  }

  function onCellPointerEnter(date: Date): void {
    if (awaitingEnd.value) hoverDate.value = date;
  }

  function onCellPointerLeave(): void {
    hoverDate.value = null;
  }

  function getTriggerProps(index: 0 | 1): Record<string, unknown> {
    const labelledby = toValue(options.ariaLabelledby);
    const describedby = toValue(options.ariaDescribedby);

    return {
      id: triggerIds[index],
      role: 'combobox',
      'aria-haspopup': 'dialog',
      'aria-expanded': isOpen.value,
      'aria-controls': contentId,
      'aria-owns': isOpen.value ? contentId : undefined,
      // 焦点格只在活跃输入框上声明，两个 combobox 同时指向一个格子会让读屏重复播报。
      'aria-activedescendant':
        isOpen.value && activeIndex.value === index
          ? getCellId(focusedDate.value, 'left')
          : undefined,
      'aria-autocomplete': 'none',
      'aria-disabled': isDisabled.value || undefined,
      'aria-labelledby': labelledby || undefined,
      'aria-describedby': describedby || undefined,
      'data-state': isOpen.value ? 'open' : 'closed',
      'data-disabled': isDisabled.value ? '' : undefined,
      'data-active': isOpen.value && activeIndex.value === index ? '' : undefined,
      disabled: isDisabled.value || undefined,
      autocomplete: 'off',
    };
  }

  function getContentProps(): Record<string, unknown> {
    return {
      id: contentId,
      role: 'dialog',
      'aria-labelledby': toValue(options.ariaLabelledby) || triggerIds[0],
      tabindex: -1,
      'data-state': isOpen.value ? 'open' : 'closed',
    };
  }

  function getGridProps(side: DateRangeSide): Record<string, unknown> {
    const anchor = side === 'left' ? panelDate.value : rightPanelDate.value;

    return { role: 'grid', 'aria-label': formatDate(anchor, 'YYYY年 M月') };
  }

  function getCellProps(date: Date, side: DateRangeSide): Record<string, unknown> {
    const state = getCellState(date, side);

    return {
      id: getCellId(date, side),
      role: 'gridcell',
      'aria-selected': state.selected,
      'aria-disabled': state.disabled || undefined,
      'aria-label': formatDate(date, 'YYYY年M月D日'),
      'data-focused': isSameDay(focusedDate.value, date) ? '' : undefined,
      'data-selected': state.selected ? '' : undefined,
      'data-range-start': state.isStart ? '' : undefined,
      'data-range-end': state.isEnd ? '' : undefined,
      'data-in-range': state.inRange ? '' : undefined,
      'data-preview': state.inPreview ? '' : undefined,
      'data-hover-end': state.isHoverEnd ? '' : undefined,
      'data-disabled': state.disabled ? '' : undefined,
      'data-today': state.today ? '' : undefined,
      'data-outside': state.inMonth ? undefined : '',
      'data-value': formatDate(date, DEFAULT_VALUE_FORMAT),
    };
  }

  function setTriggerElement(node: unknown, index: 0 | 1): void {
    triggerElements[index] = node instanceof HTMLElement ? node : null;
  }

  function setControlElement(node: unknown): void {
    floating.referenceRef.value = node instanceof HTMLElement ? node : null;
  }

  function setContentElement(node: unknown): void {
    floating.floatingRef.value = node instanceof HTMLElement ? node : null;
  }

  function handleDocumentPointerDown(event: PointerEvent): void {
    const target = event.target;

    if (!(target instanceof Node)) return;

    const control = floating.referenceRef.value;
    const content = floating.floatingRef.value;

    if (control?.contains(target) || content?.contains(target)) return;

    // 外部点击先提交活跃端的文本，再丢弃未完成的点选草稿——与 blur 规则一致。
    commitInput(activeIndex.value);
    close();
  }

  watch(
    isOpen,
    (open) => {
      if (!isBrowser) return;

      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);

      if (open) {
        document.addEventListener('pointerdown', handleDocumentPointerDown, true);
      } else {
        cleanupDrafts();
      }
    },
    { immediate: true }
  );

  const contentStyle = computed<CSSProperties>(() => ({ ...floating.floatingStyle.value }));

  onScopeDispose(() => {
    if (isBrowser) document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  });

  return {
    value,
    setValue: valueState.set,
    selectedRange,
    isOpen,
    open,
    close,
    activeIndex: computed(() => activeIndex.value),
    setActiveIndex,
    panelDate: computed(() => panelDate.value),
    rightPanelDate,
    leftCells,
    rightCells,
    weekdayLabels,
    focusedDate: computed(() => focusedDate.value),
    displayTexts,
    isDateDisabled,
    getCellState,
    pickDate,
    selectRange,
    selectRangeByValue,
    clear,
    shiftView,
    moveFocus,
    onInputInput,
    onInputKeydown,
    onInputBlur,
    onInputFocus,
    onInputClick,
    onCellPointerDown,
    onCellPointerEnter,
    onCellPointerLeave,
    getTriggerProps,
    getContentProps,
    getGridProps,
    getCellProps,
    getCellId,
    setTriggerElement,
    setControlElement,
    setContentElement,
    floating,
    contentStyle,
  };
}
