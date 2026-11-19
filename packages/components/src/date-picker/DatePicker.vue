<script setup lang="ts">
import { computed, nextTick, ref, useSlots, watch } from 'vue';

import {
  DatePickerContent,
  DatePickerGrid,
  DatePickerInput,
  DatePickerRoot,
} from '@agile-plus/ui/date-picker';

import type { PropType } from 'vue';

import type {
  DateCellState,
  DatePanel,
  DatePickerTimePart,
  DatePickerTimeParts,
  DatePickerViewUnit,
  FloatingOffset,
  FloatingPlacement,
  FloatingStrategy,
} from '@agile-plus/ui';

import type { DatePickerSize, DatePickerVariant } from './types';

/**
 * 带样式的日期选择器。
 *
 * 输入框 + 日历面板：日期 / 月份 / 年代三级面板、手动输入解析、键盘导航、
 * 「今天」快捷选择与可清除。焦点始终留在输入框上（combobox 模型），面板用
 * aria-activedescendant 指向焦点格，Tab 天然能走出组件。
 *
 * `showTime` 开启日期时间选择：面板右侧多出时 / 分 / 秒三列滚动选择，选日期
 * 不再关闭面板（保留已选时间），页脚换成「此刻 / 确定」；值与输入格式缺省
 * 升级为 'YYYY-MM-DD HH:mm:ss'。时间列的选中项在开合与值变化时滚进可视区，
 * 只写列自己的 scrollTop，不牵连祖先滚动。
 *
 * 外层多包一个 `<span class="y-date-picker">` 而不是把 class 直接挂在输入框上：
 * 日历图标与清除按钮都是输入框的**兄弟节点**（`<input>` 内不允许再放元素），
 * 它们靠绝对定位覆盖在输入框上，需要一个 `position: relative` 的共同父级；
 * 同时这个父级也是宽度（`block`）与尺寸变量的落点。
 *
 * 面板被 portal 到 body，读不到 `.y-date-picker` 上声明的自定义属性，因此变量表
 * 在 `.y-date-picker` 与 `.y-date-picker-content` 两个 Block 上各声明一次——
 * 与 Select / Toast 同一条约束。
 *
 * 面板**首次打开才挂载、打开过一次之后常驻**（`keepMounted` 默认为真）：关闭只切
 * 成 `data-state="closed"`，重开不必重建 DOM。要「关闭即卸载」就把它关掉。
 *
 * 布尔属性用运行时声明并显式 default: undefined：`open` 被转成 false 会让非受控
 * 用法永远打不开，`flip` / `shift` 被转成 false 会覆盖无头层自己的 true 默认值。
 *
 * 根是 fragment（输入框容器 + portal 面板），attrs 无法自动继承；id、aria-* 等
 * 表单 / 无障碍属性显式转交给输入框——它才是这个控件的焦点宿主与表单字段。
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: { type: String as PropType<string | null>, default: undefined },
  defaultValue: { type: String as PropType<string | null>, default: null },
  // 缺省交给无头层随 showTime 决定（日期或日期时间），这里钉死会盖掉时间格式。
  valueFormat: { type: String, default: undefined },
  format: { type: String, default: undefined },
  showTime: { type: Boolean, default: false },
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  disabledDate: { type: Function as PropType<(date: Date) => boolean>, default: undefined },
  firstDayOfWeek: { type: Number, default: 1 },
  placeholder: { type: String, default: undefined },
  size: { type: String as PropType<DatePickerSize>, default: 'middle' },
  variant: { type: String as PropType<DatePickerVariant>, default: 'outlined' },
  clearable: { type: Boolean, default: false },
  clearLabel: { type: String, default: '清除' },
  showToday: { type: Boolean, default: true },
  todayLabel: { type: String, default: '今天' },
  nowLabel: { type: String, default: '此刻' },
  confirmLabel: { type: String, default: '确定' },
  block: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  form: { type: String, default: undefined },
  ariaLabelledby: { type: String, default: undefined },
  ariaDescribedby: { type: String, default: undefined },
  placement: { type: String as PropType<FloatingPlacement>, default: undefined },
  offset: { type: [Number, Object] as PropType<number | FloatingOffset>, default: undefined },
  flip: { type: Boolean, default: undefined },
  shift: { type: Boolean, default: undefined },
  padding: { type: Number, default: undefined },
  strategy: { type: String as PropType<FloatingStrategy>, default: undefined },
  container: { type: [String, Object] as PropType<string | HTMLElement>, default: 'body' },
  /** 缺省常驻，理由见组件注释；无头层判定在 useKeepMounted，本层只做透传。 */
  keepMounted: { type: Boolean, default: true },
});

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  'update:open': [value: boolean];
  clear: [];
}>();

defineSlots<{
  /** 自定义日期格子内容；状态判定与 ARIA 仍由组件负责 */
  cell(props: { date: Date } & DateCellState): unknown;
  /** 面板页脚的额外内容，渲染在「今天」按钮之后 */
  footer(): unknown;
}>();

/** 只把属于 Root 的属性交下去：尺寸、外观、清除这些是本层自己的视觉决定。 */
const rootProps = computed(() => ({
  modelValue: props.modelValue,
  defaultValue: props.defaultValue,
  valueFormat: props.valueFormat,
  format: props.format,
  showTime: props.showTime,
  open: props.open,
  defaultOpen: props.defaultOpen,
  disabled: props.disabled,
  disabledDate: props.disabledDate,
  firstDayOfWeek: props.firstDayOfWeek,
  name: props.name,
  form: props.form,
  ariaLabelledby: props.ariaLabelledby,
  ariaDescribedby: props.ariaDescribedby,
  placement: props.placement,
  offset: props.offset,
  flip: props.flip,
  shift: props.shift,
  padding: props.padding,
  strategy: props.strategy,
}));

/** Root expose 出来的面板 API；ref 上的 ComputedRef 已被 Vue 解包成纯值。 */
interface RootExpose {
  value: string | null;
  setValue(value: string | null): void;
  isOpen: boolean;
  panel: DatePanel;
  panelDate: Date;
  setPanel(panel: DatePanel): void;
  shiftView(unit: DatePickerViewUnit, delta: -1 | 1): void;
  decadeLabel: string;
  goToday(): void;
  isTodayDisabled: boolean;
  getCellState(date: Date): DateCellState;
  showTime: boolean;
  timeParts: DatePickerTimeParts;
  setTimePart(part: DatePickerTimePart, amount: number): void;
  confirm(): void;
  goNow(): void;
  getTimeListProps(part: DatePickerTimePart): Record<string, unknown>;
  getTimeOptionProps(part: DatePickerTimePart, amount: number): Record<string, unknown>;
  onCellPointerDown(event: PointerEvent): void;
}

const rootRef = ref<RootExpose | null>(null);

const panel = computed<DatePanel>(() => rootRef.value?.panel ?? 'date');

const panelYear = computed(() => (rootRef.value?.panelDate ?? new Date()).getFullYear());

const panelMonth = computed(() => (rootRef.value?.panelDate ?? new Date()).getMonth() + 1);

const placeholderText = computed(
  () => props.placeholder ?? (props.showTime ? '请选择日期时间' : '请选择日期')
);

const timeText = computed(() => {
  const parts = rootRef.value?.timeParts ?? { hour: 0, minute: 0, second: 0 };

  return `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
});

const hasValue = computed(() => {
  const value = rootRef.value?.value;

  return value !== null && value !== undefined && value !== '';
});

const showClear = computed(() => props.clearable && hasValue.value && !props.disabled);

const slots = useSlots();

const showFooter = computed(
  () => props.showTime || (panel.value === 'date' && (props.showToday || Boolean(slots.footer)))
);

/** 时间三列的选项是固定值域，模块级常量即可，不随组件实例重建。 */
const TIME_COLUMNS: { part: DatePickerTimePart; items: number[] }[] = [
  { part: 'hour', items: Array.from({ length: 24 }, (_, index) => index) },
  { part: 'minute', items: Array.from({ length: 60 }, (_, index) => index) },
  { part: 'second', items: Array.from({ length: 60 }, (_, index) => index) },
];

const columnEls: Partial<Record<DatePickerTimePart, HTMLElement | null>> = {};

function setColumnRef(part: DatePickerTimePart, node: unknown): void {
  columnEls[part] = node instanceof HTMLElement ? node : null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * 选中项滚进列可视区：先统一读几何再统一写 scrollTop，避免读写交错。
 * 只写列自己的滚动，不用 scrollIntoView——那会连带滚动所有可滚动祖先。
 */
function syncTimeColumns(): void {
  const targets: { column: HTMLElement; top: number }[] = [];

  for (const { part } of TIME_COLUMNS) {
    const column = columnEls[part];
    const selected = column?.querySelector<HTMLElement>('[data-selected]');

    if (!column || !selected) continue;

    targets.push({
      column,
      top: selected.offsetTop - (column.clientHeight - selected.offsetHeight) / 2,
    });
  }

  for (const { column, top } of targets) column.scrollTop = top;
}

watch(
  () => [rootRef.value?.isOpen, rootRef.value?.value] as const,
  ([open]) => {
    // 首次打开时面板懒挂载：本层 post watch 先于子层 presence 的挂载跑，
    // 等 nextTick 让列元素先落地，再读几何写滚动。
    if (open) void nextTick(syncTimeColumns);
  },
  { flush: 'post' }
);

function cellState(date: Date): DateCellState {
  return (
    rootRef.value?.getCellState(date) ?? {
      selected: false,
      disabled: false,
      today: false,
      inMonth: true,
    }
  );
}

function onShiftView(unit: DatePickerViewUnit, delta: -1 | 1): void {
  rootRef.value?.shiftView(unit, delta);
}

function setPanel(next: DatePanel): void {
  rootRef.value?.setPanel(next);
}

function onClear(): void {
  rootRef.value?.setValue(null);

  emit('clear');
}
</script>

<template>
  <DatePickerRoot
    v-bind="rootProps"
    ref="rootRef"
    @update:model-value="(value) => emit('update:modelValue', value)"
    @update:open="(value) => emit('update:open', value)"
  >
    <span
      :class="[
        'y-date-picker',
        `y-date-picker--${props.size}`,
        `y-date-picker--${props.variant}`,
        { 'is-block': props.block },
      ]"
    >
      <DatePickerInput
        class="y-date-picker__input"
        v-bind="$attrs"
        :placeholder="placeholderText"
      />

      <span class="y-date-picker__icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect
            x="1.5"
            y="2.5"
            width="11"
            height="10"
            rx="1.5"
            stroke="currentColor"
            stroke-width="1.3"
          />
          <path
            d="M1.5 5.5h11M4.5 1v2.5M9.5 1v2.5"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
          />
        </svg>
      </span>

      <button
        v-if="showClear"
        type="button"
        class="y-date-picker__clear"
        :aria-label="props.clearLabel"
        @click="onClear"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M2 2l6 6M8 2l-6 6"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </span>

    <DatePickerContent
      :class="['y-date-picker-content', { 'y-date-picker-content--with-time': props.showTime }]"
      :container="props.container"
      :keep-mounted="props.keepMounted"
    >
      <div class="y-date-picker-content__body">
        <div class="y-date-picker-content__calendar">
          <div class="y-date-picker-content__header">
            <button
              type="button"
              class="y-date-picker-content__nav-btn"
              :aria-label="panel === 'year' ? '上一年代' : '上一年'"
              @click="onShiftView(panel === 'year' ? 'decade' : 'year', -1)"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M6.5 2.5 3 6l3.5 3.5M10 2.5 6.5 6l3.5 3.5"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <button
              v-if="panel === 'date'"
              type="button"
              class="y-date-picker-content__nav-btn"
              aria-label="上一月"
              @click="onShiftView('month', -1)"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M7.5 2.5 4 6l3.5 3.5"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <div class="y-date-picker-content__header-label">
              <template v-if="panel === 'date'">
                <button
                  type="button"
                  class="y-date-picker-content__label-btn"
                  @click="setPanel('year')"
                >
                  {{ panelYear }}年
                </button>
                <button
                  type="button"
                  class="y-date-picker-content__label-btn"
                  @click="setPanel('month')"
                >
                  {{ panelMonth }}月
                </button>
              </template>

              <button
                v-else-if="panel === 'month'"
                type="button"
                class="y-date-picker-content__label-btn"
                @click="setPanel('year')"
              >
                {{ panelYear }}年
              </button>

              <span v-else>{{ rootRef?.decadeLabel }}</span>
            </div>

            <button
              v-if="panel === 'date'"
              type="button"
              class="y-date-picker-content__nav-btn"
              aria-label="下一月"
              @click="onShiftView('month', 1)"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M4.5 2.5 8 6l-3.5 3.5"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <button
              type="button"
              class="y-date-picker-content__nav-btn"
              :aria-label="panel === 'year' ? '下一年代' : '下一年'"
              @click="onShiftView(panel === 'year' ? 'decade' : 'year', 1)"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M5.5 2.5 9 6l-3.5 3.5M2 2.5 5.5 6 2 9.5"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>

          <DatePickerGrid :kind="panel">
            <template v-if="panel === 'date'" #cell="{ cell }">
              <slot name="cell" :date="cell.date" v-bind="cellState(cell.date)">
                {{ cell.date.getDate() }}
              </slot>
            </template>
          </DatePickerGrid>
        </div>

        <div v-if="props.showTime" class="y-date-picker-content__time">
          <div class="y-date-picker-content__time-header" aria-hidden="true">{{ timeText }}</div>

          <div class="y-date-picker-content__time-body">
            <ul
              v-for="column in TIME_COLUMNS"
              :key="column.part"
              :ref="(node) => setColumnRef(column.part, node)"
              class="y-date-picker-content__time-column"
              v-bind="rootRef?.getTimeListProps(column.part)"
            >
              <li
                v-for="amount in column.items"
                :key="amount"
                class="y-date-picker-content__time-option"
                v-bind="rootRef?.getTimeOptionProps(column.part, amount)"
                @pointerdown="rootRef?.onCellPointerDown($event)"
                @click="rootRef?.setTimePart(column.part, amount)"
              >
                {{ pad(amount) }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div
        v-if="showFooter"
        :class="[
          'y-date-picker-content__footer',
          { 'y-date-picker-content__footer--time': props.showTime },
        ]"
      >
        <button
          v-if="props.showTime"
          type="button"
          class="y-date-picker-content__now"
          @click="rootRef?.goNow()"
        >
          {{ props.nowLabel }}
        </button>

        <button
          v-else-if="props.showToday"
          type="button"
          class="y-date-picker-content__today"
          :disabled="rootRef?.isTodayDisabled"
          @click="rootRef?.goToday()"
        >
          {{ props.todayLabel }}
        </button>

        <slot name="footer" />

        <button
          v-if="props.showTime"
          type="button"
          class="y-date-picker-content__confirm"
          @click="rootRef?.confirm()"
        >
          {{ props.confirmLabel }}
        </button>
      </div>
    </DatePickerContent>
  </DatePickerRoot>
</template>

<style lang="scss">
@use './DatePicker.scss';
</style>
