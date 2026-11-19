<script setup lang="ts">
import { computed, ref, useSlots, watch } from 'vue';

import {
  DateRangePickerContent,
  DateRangePickerGrid,
  DateRangePickerInput,
  DateRangePickerRoot,
} from '@agile-plus/ui/date-range-picker';

import type { PropType } from 'vue';

import type {
  DateRangeCellState,
  DateRangeSide,
  DateRangeViewUnit,
  FloatingOffset,
  FloatingPlacement,
  FloatingStrategy,
} from '@agile-plus/ui';

import type { DateRangePickerSize, DateRangePickerVariant, DateRangePreset } from './types';

/**
 * 带样式的期间（范围）选择器。
 *
 * 双输入框 + 左右两月面板：点起点 → 悬停预览 → 点终点（早于起点自动交换），
 * 两端确定即提交关闭。焦点始终留在活跃输入框上，Tab 先换端再走出组件。
 *
 * 外层 `<span class="y-date-range-picker">` 是两端输入框的共同边框容器，也是
 * 浮层定位的锚点（经 Root expose 的 setControlElement 交给无头层）：面板应当
 * 对齐整个控件而不是某一端输入框。
 *
 * 面板被 portal 到 body，变量表在 `.y-date-range-picker` 与
 * `.y-date-range-picker-content` 两个 Block 上各声明一次——与 DatePicker 同理。
 *
 * 布尔属性用运行时声明并显式 default: undefined，理由与 DatePicker 相同。
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
  // 元组 prop 用 Object 构造器，理由与 DateRangePickerRoot 相同：ArrayConstructor
  // 返回 any[]，无法断言到定长元组；运行时 isObject 对数组同样通过。
  modelValue: { type: Object as PropType<[string, string] | null>, default: undefined },
  defaultValue: { type: Object as PropType<[string, string] | null>, default: null },
  valueFormat: { type: String, default: 'YYYY-MM-DD' },
  format: { type: String, default: 'YYYY-MM-DD' },
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  disabledDate: { type: Function as PropType<(date: Date) => boolean>, default: undefined },
  firstDayOfWeek: { type: Number, default: 1 },
  placeholders: {
    // 元组经 Object 构造器声明（见文件头注释），默认值工厂返回数组是有意为之，
    // 运行时 isObject 校验通过；规则按字面形状判定，这里不适用。
    type: Object as PropType<[string, string]>,
    // eslint-disable-next-line vue/require-valid-default-prop
    default: () => ['开始日期', '结束日期'],
  },
  size: { type: String as PropType<DateRangePickerSize>, default: 'middle' },
  variant: { type: String as PropType<DateRangePickerVariant>, default: 'outlined' },
  clearable: { type: Boolean, default: false },
  clearLabel: { type: String, default: '清除' },
  block: { type: Boolean, default: false },
  presets: { type: Array as PropType<DateRangePreset[]>, default: () => [] },
  ariaLabelledby: { type: String, default: undefined },
  ariaDescribedby: { type: String, default: undefined },
  placement: { type: String as PropType<FloatingPlacement>, default: undefined },
  offset: { type: [Number, Object] as PropType<number | FloatingOffset>, default: undefined },
  flip: { type: Boolean, default: undefined },
  shift: { type: Boolean, default: undefined },
  padding: { type: Number, default: undefined },
  strategy: { type: String as PropType<FloatingStrategy>, default: undefined },
  container: { type: [String, Object] as PropType<string | HTMLElement>, default: 'body' },
  /** 缺省常驻，理由与 DatePicker 相同；无头层判定在 useKeepMounted。 */
  keepMounted: { type: Boolean, default: true },
});

const emit = defineEmits<{
  'update:modelValue': [value: [string, string] | null];
  'update:open': [value: boolean];
  clear: [];
}>();

defineSlots<{
  /** 自定义日期格子内容；范围状态判定与 ARIA 仍由组件负责 */
  cell(props: { date: Date } & DateRangeCellState): unknown;
  /** 两端输入框之间的分隔符，默认箭头 */
  separator(): unknown;
  /** 面板页脚的额外内容，渲染在预设按钮之后 */
  footer(): unknown;
}>();

/** 只把属于 Root 的属性交下去：尺寸、外观、清除、预设是本层自己的视觉决定。 */
const rootProps = computed(() => ({
  modelValue: props.modelValue,
  defaultValue: props.defaultValue,
  valueFormat: props.valueFormat,
  format: props.format,
  open: props.open,
  defaultOpen: props.defaultOpen,
  disabled: props.disabled,
  disabledDate: props.disabledDate,
  firstDayOfWeek: props.firstDayOfWeek,
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
  value: [string, string] | null;
  setValue(value: [string, string] | null): void;
  isOpen: boolean;
  panelDate: Date;
  rightPanelDate: Date;
  shiftView(unit: DateRangeViewUnit, delta: -1 | 1): void;
  selectRangeByValue(start: string, end: string): void;
  setControlElement(node: unknown): void;
  getCellState(date: Date, side: DateRangeSide): DateRangeCellState;
}

const rootRef = ref<RootExpose | null>(null);

const controlEl = ref<HTMLElement | null>(null);

// 定位锚点是外层容器而不是输入框；post-flush 保证 Root 的 expose 已就绪。
watch(
  controlEl,
  (element) => {
    rootRef.value?.setControlElement(element);
  },
  { flush: 'post' }
);

const slots = useSlots();

const isOpen = computed(() => rootRef.value?.isOpen ?? false);

const leftLabel = computed(() => {
  const date = rootRef.value?.panelDate ?? new Date();

  return `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
});

const rightLabel = computed(() => {
  const date = rootRef.value?.rightPanelDate ?? new Date();

  return `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
});

const hasValue = computed(() => rootRef.value?.value != null);

const showClear = computed(() => props.clearable && hasValue.value && !props.disabled);

const showFooter = computed(() => props.presets.length > 0 || Boolean(slots.footer));

const EMPTY_CELL_STATE: DateRangeCellState = {
  selected: false,
  disabled: false,
  today: false,
  inMonth: true,
  isStart: false,
  isEnd: false,
  inRange: false,
  isHoverEnd: false,
  inPreview: false,
};

function cellState(date: Date, side: DateRangeSide): DateRangeCellState {
  return rootRef.value?.getCellState(date, side) ?? EMPTY_CELL_STATE;
}

function onShiftView(unit: DateRangeViewUnit, delta: -1 | 1): void {
  rootRef.value?.shiftView(unit, delta);
}

function applyPreset(preset: DateRangePreset): void {
  rootRef.value?.selectRangeByValue(preset.value[0], preset.value[1]);
}

function onClear(): void {
  rootRef.value?.setValue(null);

  emit('clear');
}
</script>

<template>
  <DateRangePickerRoot
    v-bind="rootProps"
    ref="rootRef"
    @update:model-value="(value) => emit('update:modelValue', value)"
    @update:open="(value) => emit('update:open', value)"
  >
    <span
      ref="controlEl"
      v-bind="$attrs"
      :class="[
        'y-date-range-picker',
        `y-date-range-picker--${props.size}`,
        `y-date-range-picker--${props.variant}`,
        { 'is-block': props.block },
      ]"
      :data-state="isOpen ? 'open' : 'closed'"
      :data-disabled="props.disabled ? '' : undefined"
    >
      <DateRangePickerInput
        :index="0"
        class="y-date-range-picker__input"
        :placeholder="props.placeholders[0]"
      />

      <span class="y-date-range-picker__separator" aria-hidden="true">
        <slot name="separator">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 7h9M8 3.5 11.5 7 8 10.5"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </slot>
      </span>

      <DateRangePickerInput
        :index="1"
        class="y-date-range-picker__input"
        :placeholder="props.placeholders[1]"
      />

      <span class="y-date-range-picker__icon" aria-hidden="true">
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
        class="y-date-range-picker__clear"
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

    <DateRangePickerContent
      class="y-date-range-picker-content"
      :container="props.container"
      :keep-mounted="props.keepMounted"
    >
      <div class="y-date-range-picker-content__header">
        <button
          type="button"
          class="y-date-range-picker-content__nav-btn"
          aria-label="上一年"
          @click="onShiftView('year', -1)"
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
          type="button"
          class="y-date-range-picker-content__nav-btn"
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

        <div class="y-date-range-picker-content__header-label">{{ leftLabel }}</div>
        <div class="y-date-range-picker-content__header-label">{{ rightLabel }}</div>

        <button
          type="button"
          class="y-date-range-picker-content__nav-btn"
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
          class="y-date-range-picker-content__nav-btn"
          aria-label="下一年"
          @click="onShiftView('year', 1)"
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

      <div class="y-date-range-picker-content__panels">
        <DateRangePickerGrid side="left">
          <template #cell="{ cell }">
            <slot name="cell" :date="cell.date" v-bind="cellState(cell.date, 'left')">
              {{ cell.date.getDate() }}
            </slot>
          </template>
        </DateRangePickerGrid>

        <DateRangePickerGrid side="right">
          <template #cell="{ cell }">
            <slot name="cell" :date="cell.date" v-bind="cellState(cell.date, 'right')">
              {{ cell.date.getDate() }}
            </slot>
          </template>
        </DateRangePickerGrid>
      </div>

      <div v-if="showFooter" class="y-date-range-picker-content__footer">
        <button
          v-for="preset in props.presets"
          :key="preset.label"
          type="button"
          class="y-date-range-picker-content__preset"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </button>

        <slot name="footer" />
      </div>
    </DateRangePickerContent>
  </DateRangePickerRoot>
</template>

<style lang="scss">
@use './DateRangePicker.scss';
</style>
