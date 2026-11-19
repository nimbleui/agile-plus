import { computed, onScopeDispose, ref, toValue, useId, watch } from 'vue';

import {
  addMonths,
  formatDate,
  getCalendarGrid,
  getDecadeLabel,
  getMonthGrid,
  getWeekdayLabels,
  getYearGrid,
  isSameDay,
  isSameMonth,
  parseDate,
  resolveDateMove,
  resolveDatePickerKeyIntent,
  startOfDay,
} from '@agile-plus/primitives/date';

import { useControllable } from '../utils/useControllable';
import { useFormResetListener } from '../utils/useFormResetListener';
import { isBrowser } from '../utils/env';
import { useFloating } from '../useFloating';

import type { CSSProperties } from 'vue';

import type { DateCell, DateCellState, DateMove, DatePanel } from '@agile-plus/primitives/date';

import type {
  DatePickerTimePart,
  DatePickerTimeParts,
  DatePickerViewUnit,
  UseDatePickerOptions,
  UseDatePickerReturn,
} from './types';

/** 面板与输入框之间的缺省间距，与 Select 的视觉留白一致。 */
const DEFAULT_OFFSET = 4;

/** 面板与视口边缘的缺省留白。 */
const DEFAULT_PADDING = 8;

const DEFAULT_VALUE_FORMAT = 'YYYY-MM-DD';

const DEFAULT_DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const HOURS_PER_DAY = 24;

const MINUTES_PER_HOUR = 60;

const SECONDS_PER_MINUTE = 60;

const DEFAULT_FIRST_DAY_OF_WEEK = 1;

const DAYS_PER_WEEK = 7;

/**
 * DatePicker 的 Vue 适配。
 *
 * 五块职责：**选中值与开合**（两个独立的受控状态）、**面板与焦点日期**（三个
 * 面板共享一个展示月）、**输入草稿**（手动编辑与回显分离）、**键盘导航**（规则
 * 全部下沉 primitives）、**定位与表单接入**。
 *
 * 焦点模型与 Select 相同：焦点**始终留在输入框**上，面板通过 aria-activedescendant
 * 指向焦点格，而不是把焦点移进浮层。因此不需要焦点陷阱，Tab 天然能走出组件；
 * 代价是格子不可聚焦，指针按下必须 preventDefault，否则点击格子会把焦点从输入框
 * 抢走并触发 blur 提交。
 *
 * 输入草稿只在编辑期间存在：blur / Enter / 外部点击时提交，合法则写值、非法则
 * 回退到选中值的格式化文本；Escape 关闭时丢弃草稿。提交与回退都不经过额外的
 * watch，displayText 直接从「草稿 ?? 选中值」派生。
 */
export function useDatePicker(options: UseDatePickerOptions = {}): UseDatePickerReturn {
  const uid = useId();
  const triggerId = `date-picker-trigger-${uid}`;
  const contentId = `date-picker-content-${uid}`;

  const showTime = computed(() => toValue(options.showTime) === true);

  // 格式缺省是唯一真源：showTime 打开时日期与时间一起存储 / 显示，消费者显式
  // 给了格式则以消费者为准（比如只要 HH:mm 的精度）。格式与 showTime 都要响应式
  // 读取：演练场 / 受控用法会在运行中切换它们。
  const valueFormat = computed(
    () =>
      toValue(options.valueFormat) ??
      (showTime.value ? DEFAULT_DATETIME_FORMAT : DEFAULT_VALUE_FORMAT)
  );

  const format = computed(
    () =>
      toValue(options.format) ?? (showTime.value ? DEFAULT_DATETIME_FORMAT : DEFAULT_VALUE_FORMAT)
  );

  const valueState = useControllable<string | null>({
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

  const selectedDate = computed<Date | null>(() => {
    const current = value.value;

    if (current === null || current === '') return null;

    return parseDate(current, valueFormat.value);
  });

  const panel = ref<DatePanel>('date');
  const panelDate = ref(startOfMonth(selectedDate.value ?? new Date()));
  const focusedDate = ref(startOfDay(selectedDate.value ?? new Date()));

  const draft = ref<string | null>(null);

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

  const displayText = computed(() => {
    if (draft.value !== null) return draft.value;

    return selectedDate.value ? formatDate(selectedDate.value, format.value) : '';
  });

  const dateCells = computed<DateCell[]>(() =>
    getCalendarGrid({
      year: panelDate.value.getFullYear(),
      month: panelDate.value.getMonth(),
      firstDayOfWeek: firstDayOfWeek.value,
    })
  );

  const monthCells = computed<DateCell[]>(() => getMonthGrid(panelDate.value.getFullYear()));

  const yearCells = computed<DateCell[]>(() => getYearGrid(panelDate.value.getFullYear()));

  const weekdayLabels = computed(() => getWeekdayLabels(firstDayOfWeek.value));

  const headerLabel = computed(() => formatDate(panelDate.value, 'YYYY年 M月'));

  const decadeLabel = computed(() => getDecadeLabel(panelDate.value.getFullYear()));

  function isDateDisabled(date: Date): boolean {
    if (isDisabled.value) return true;

    return options.disabledDate ? options.disabledDate(startOfDay(date)) : false;
  }

  const isTodayDisabled = computed(() => isDateDisabled(new Date()));

  function getCellState(date: Date): DateCellState {
    const selected = selectedDate.value;

    return {
      selected: selected !== null && isSameDay(selected, date),
      disabled: isDateDisabled(date),
      today: isSameDay(new Date(), date),
      inMonth: isSameMonth(panelDate.value, date),
    };
  }

  function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /** 焦点与展示月一起移动：键盘导航走到哪个月，面板就翻到哪个月。 */
  function syncView(date: Date): void {
    focusedDate.value = startOfDay(date);
    panelDate.value = startOfMonth(date);
  }

  function getCellId(date: Date, kind: DatePanel): string {
    // 月份 / 年代格子的日期是「月首 / 年首」，焦点日期必须先归一到同一格，
    // 否则 aria-activedescendant 指向一个不存在的 id。
    const normalized =
      kind === 'month'
        ? startOfMonth(date)
        : kind === 'year'
          ? new Date(date.getFullYear(), 0, 1)
          : date;

    return `date-picker-cell-${uid}-${kind}-${formatDate(normalized, DEFAULT_VALUE_FORMAT)}`;
  }

  function open(): void {
    if (isDisabled.value) return;

    panel.value = 'date';
    syncView(selectedDate.value ?? new Date());
    openState.set(true);
  }

  function close(): void {
    const content = floating.floatingRef.value;
    const active = isBrowser ? document.activeElement : null;

    // 清理必须同步做：同一 tick 内 open→close 时 watch 的新旧值相同会被跳过，
    // 只靠 watch 清理会让草稿与子面板状态泄漏到下一次打开。
    draft.value = null;
    panel.value = 'date';
    openState.set(false);

    // 焦点曾在面板内才交还输入框；外部点击关闭时不抢焦点。
    if (content && active instanceof Node && content.contains(active)) {
      skipFocusOpen = true;
      floating.referenceRef.value?.focus();
    }
  }

  function selectDate(date: Date): void {
    if (isDateDisabled(date)) return;

    // showTime 时日期与时间分两步选：换日期保留已选时间，面板不关，等「确定」。
    const next = showTime.value ? withSelectedTime(date) : startOfDay(date);

    valueState.set(formatDate(next, valueFormat.value));

    if (!showTime.value) close();
  }

  /** 日期部分取入参、时间部分取当前选中值；未选过时间则落零点。 */
  function withSelectedTime(date: Date): Date {
    const next = startOfDay(date);
    const current = selectedDate.value;

    if (current) {
      next.setHours(current.getHours(), current.getMinutes(), current.getSeconds());
    }

    return next;
  }

  const timeParts = computed<DatePickerTimeParts>(() => {
    const current = selectedDate.value;

    return {
      hour: current?.getHours() ?? 0,
      minute: current?.getMinutes() ?? 0,
      second: current?.getSeconds() ?? 0,
    };
  });

  function setTimePart(part: DatePickerTimePart, amount: number): void {
    if (isDisabled.value) return;

    const limit =
      part === 'hour' ? HOURS_PER_DAY : part === 'minute' ? MINUTES_PER_HOUR : SECONDS_PER_MINUTE;

    if (!Number.isInteger(amount) || amount < 0 || amount >= limit) return;

    // 先选时间后选日期也成立：日期部分缺省落今天，与「此刻」的日期语义一致。
    const next = new Date(selectedDate.value ?? startOfDay(new Date()));

    if (part === 'hour') next.setHours(amount);
    else if (part === 'minute') next.setMinutes(amount);
    else next.setSeconds(amount);

    valueState.set(formatDate(next, valueFormat.value));
  }

  function confirm(): void {
    commitInput();
    close();
  }

  function goNow(): void {
    if (isDisabled.value) return;

    valueState.set(formatDate(new Date(), valueFormat.value));
    close();
  }

  function getTimeListProps(part: DatePickerTimePart): Record<string, unknown> {
    const label = part === 'hour' ? '选择小时' : part === 'minute' ? '选择分钟' : '选择秒';

    return { role: 'listbox', 'aria-label': label, 'data-part': `time-${part}` };
  }

  function getTimeOptionProps(part: DatePickerTimePart, amount: number): Record<string, unknown> {
    const isSelected = timeParts.value[part] === amount;

    return {
      role: 'option',
      'aria-selected': isSelected,
      'data-selected': isSelected ? '' : undefined,
      'data-value': amount,
    };
  }

  function clear(): void {
    draft.value = null;
    valueState.set(null);
  }

  function goToday(): void {
    selectDate(new Date());
  }

  function setPanel(next: DatePanel): void {
    panel.value = next;

    // 进入子面板时焦点落到当前展示月：头部按钮切换的是「看哪个月 / 年」，
    // 焦点跟着视图走，读屏播报的才是眼前这一格。
    if (next !== 'date') focusedDate.value = panelDate.value;
  }

  function shiftView(unit: DatePickerViewUnit, delta: -1 | 1): void {
    const months = unit === 'month' ? 1 : unit === 'year' ? 12 : 120;

    panelDate.value = addMonths(panelDate.value, delta * months);
    focusedDate.value = addMonths(focusedDate.value, delta * months);
  }

  function moveFocus(move: DateMove): void {
    syncView(resolveDateMove(focusedDate.value, move));
  }

  /** 月份面板确认：展示月切到焦点月，回到日期面板。 */
  function commitMonth(date: Date): void {
    syncView(date);
    panel.value = 'date';
  }

  /** 年代面板确认：保留当前月，只换年，下钻到月份面板。 */
  function commitYear(date: Date): void {
    const current = focusedDate.value;
    const next = addMonths(new Date(date.getFullYear(), 0, current.getDate()), current.getMonth());

    syncView(next);
    panel.value = 'month';
  }

  function commitFocused(): void {
    if (panel.value === 'date') {
      selectDate(focusedDate.value);

      // showTime 时 selectDate 不关面板，Enter 的语义是「确认整个值」，补一次关闭。
      if (showTime.value) close();
    } else if (panel.value === 'month') commitMonth(focusedDate.value);
    else commitYear(focusedDate.value);
  }

  /**
   * 提交输入草稿：空文本清空值，合法日期写值，非法文本静默回退。
   *
   * 回退不需要额外动作——草稿置 null 后 displayText 自动落回选中值的格式化文本。
   */
  function commitInput(): void {
    if (draft.value === null) return;

    const text = draft.value.trim();

    draft.value = null;

    if (text === '') {
      valueState.set(null);

      return;
    }

    const parsed = parseDate(text, format.value);

    if (!parsed || isDateDisabled(parsed)) return;

    valueState.set(formatDate(parsed, valueFormat.value));

    if (isOpen.value) syncView(parsed);
  }

  function onInputInput(event: Event): void {
    if (isDisabled.value) return;

    const target = event.target;

    if (target instanceof HTMLInputElement) draft.value = target.value;
  }

  function onInputBlur(): void {
    commitInput();
  }

  function onInputFocus(): void {
    if (skipFocusOpen) {
      skipFocusOpen = false;

      return;
    }

    if (!isDisabled.value && !isOpen.value) open();
  }

  function onInputClick(): void {
    if (!isDisabled.value && !isOpen.value) open();
  }

  function onInputKeydown(event: KeyboardEvent): void {
    if (isDisabled.value) return;

    // 关闭态的 Enter 只在有草稿时接管（提交文本），否则交还浏览器做表单提交。
    if (!isOpen.value && event.key === 'Enter' && draft.value !== null) {
      event.preventDefault();
      commitInput();

      return;
    }

    const intent = resolveDatePickerKeyIntent({
      key: event.key,
      open: isOpen.value,
      panel: panel.value,
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

    if (intent.kind === 'open') open();
    else if (intent.kind === 'close') close();
    else if (intent.kind === 'move') moveFocus(intent.move);
    else if (intent.kind === 'commit') {
      if (draft.value !== null) {
        commitInput();
        close();
      } else {
        commitFocused();
      }
    }
  }

  function onCellPointerDown(event: PointerEvent): void {
    // 焦点必须留在输入框：格子一旦抢走焦点，blur 会先提交草稿，combobox 模型即被破坏。
    event.preventDefault();
  }

  function onCellClick(date: Date, kind: DatePanel): void {
    if (isDisabled.value) return;

    if (kind === 'date') selectDate(date);
    else if (kind === 'month') commitMonth(date);
    else commitYear(date);
  }

  function getTriggerProps(): Record<string, unknown> {
    const labelledby = toValue(options.ariaLabelledby);
    const describedby = toValue(options.ariaDescribedby);

    return {
      id: triggerId,
      role: 'combobox',
      'aria-haspopup': 'dialog',
      'aria-expanded': isOpen.value,
      'aria-controls': contentId,
      // 面板被 portal 到 body，不是输入框的 DOM 后代；打开时显式声明所有权，
      // 否则读屏拒绝播报 aria-activedescendant 指向的格子。与 Select 同一条约束。
      'aria-owns': isOpen.value ? contentId : undefined,
      'aria-activedescendant': isOpen.value ? getCellId(focusedDate.value, panel.value) : undefined,
      'aria-autocomplete': 'none',
      'aria-disabled': isDisabled.value || undefined,
      'aria-labelledby': labelledby || undefined,
      'aria-describedby': describedby || undefined,
      'data-state': isOpen.value ? 'open' : 'closed',
      'data-disabled': isDisabled.value ? '' : undefined,
      disabled: isDisabled.value || undefined,
      autocomplete: 'off',
      name: toValue(options.name),
      form: toValue(options.form),
    };
  }

  function getContentProps(): Record<string, unknown> {
    return {
      id: contentId,
      role: 'dialog',
      'aria-labelledby': toValue(options.ariaLabelledby) || triggerId,
      tabindex: -1,
      'data-state': isOpen.value ? 'open' : 'closed',
      'data-panel': panel.value,
    };
  }

  function getGridProps(kind: DatePanel): Record<string, unknown> {
    const label =
      kind === 'date'
        ? headerLabel.value
        : kind === 'month'
          ? '选择月份'
          : `${decadeLabel.value} 选择年份`;

    return { role: 'grid', 'aria-label': label };
  }

  function getCellProps(date: Date, kind: DatePanel): Record<string, unknown> {
    const selected = selectedDate.value;
    const focused = focusedDate.value;

    const isSelected =
      kind === 'date'
        ? selected !== null && isSameDay(selected, date)
        : kind === 'month'
          ? selected !== null && isSameMonth(selected, date)
          : selected !== null && selected.getFullYear() === date.getFullYear();

    const isFocused =
      kind === 'date'
        ? isSameDay(focused, date)
        : kind === 'month'
          ? isSameMonth(focused, date)
          : focused.getFullYear() === date.getFullYear();

    const state = kind === 'date' ? getCellState(date) : null;
    const isDisabledCell = state ? state.disabled : false;

    let isOutside = false;

    if (state) {
      isOutside = !state.inMonth;
    } else if (kind === 'year') {
      // 年代网格的首尾补齐格属于相邻年代，边界按「当前展示年代」而不是格子自身年代算。
      const decadeStart = Math.floor(panelDate.value.getFullYear() / 10) * 10;

      isOutside = date.getFullYear() < decadeStart || date.getFullYear() >= decadeStart + 10;
    }

    return {
      id: getCellId(date, kind),
      role: 'gridcell',
      'aria-selected': isSelected,
      'aria-disabled': isDisabledCell || undefined,
      // 日期格子只渲染「几号」，读屏需要完整日期才有意义；月 / 年格子的文本自足。
      'aria-label': kind === 'date' ? formatDate(date, 'YYYY年M月D日') : undefined,
      'data-focused': isFocused ? '' : undefined,
      'data-selected': isSelected ? '' : undefined,
      'data-disabled': isDisabledCell ? '' : undefined,
      'data-today': state?.today ? '' : undefined,
      'data-outside': isOutside ? '' : undefined,
      'data-value': formatDate(date, DEFAULT_VALUE_FORMAT),
    };
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

    // 外部点击与 blur 一样是「结束编辑」：先提交草稿再关闭，手动输入不因点别处而丢。
    commitInput();
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
        // 受控模式下外部直接翻 open 也要清理编辑态，与 close() 的语义保持一致。
        draft.value = null;
        panel.value = 'date';
      }
    },
    { immediate: true }
  );

  // 与 Select 同一条规则：reset 还原到「挂载时的值」，且必须走 set 通知外部——
  // 受控模式下 replace 不写内部状态，v-model 的值会永远停在用户改过的地方。
  const initialValue = value.value;

  useFormResetListener(
    floating.referenceRef,
    () => {
      valueState.set(initialValue);
      draft.value = null;
      panel.value = 'date';
      syncView(
        initialValue ? (parseDate(initialValue, valueFormat.value) ?? new Date()) : new Date()
      );
    },
    options.form
  );

  const contentStyle = computed<CSSProperties>(() => ({ ...floating.floatingStyle.value }));

  onScopeDispose(() => {
    if (isBrowser) document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  });

  return {
    value,
    setValue: valueState.set,
    selectedDate,
    isOpen,
    open,
    close,
    panel: computed(() => panel.value),
    setPanel,
    panelDate: computed(() => panelDate.value),
    focusedDate: computed(() => focusedDate.value),
    dateCells,
    monthCells,
    yearCells,
    weekdayLabels,
    headerLabel,
    decadeLabel,
    displayText,
    isTodayDisabled,
    isDateDisabled,
    getCellState,
    selectDate,
    clear,
    goToday,
    showTime,
    timeParts,
    setTimePart,
    confirm,
    goNow,
    getTimeListProps,
    getTimeOptionProps,
    moveFocus,
    commitFocused,
    shiftView,
    onInputInput,
    onInputKeydown,
    onInputBlur,
    onInputFocus,
    onInputClick,
    onCellPointerDown,
    onCellClick,
    getTriggerProps,
    getContentProps,
    getGridProps,
    getCellProps,
    getCellId,
    setTriggerElement,
    setContentElement,
    floating,
    contentStyle,
  };
}
