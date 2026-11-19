<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import type { DatePickerCellProps } from './types';

/**
 * DatePicker 的单个格子。
 *
 * role / aria / data-* 全部来自无头层的 getCellProps；pointerdown 被拦掉以把
 * 焦点留在输入框上（combobox 模型），click 才触发选值 / 下钻。
 * 默认文本按面板类型给出：日期是「几号」，月份是「几月」，年代是年份。
 */
const props = withDefaults(defineProps<DatePickerCellProps>(), {
  kind: 'date',
});

const picker = useComponentContext('datePicker');

const cellProps = computed(() => picker.getCellProps(props.date, props.kind));

const fallbackLabel = computed(() => {
  if (props.kind === 'month') return `${props.date.getMonth() + 1}月`;

  if (props.kind === 'year') return String(props.date.getFullYear());

  return String(props.date.getDate());
});
</script>

<template>
  <div
    v-bind="cellProps"
    data-part="cell"
    @pointerdown="picker.onCellPointerDown"
    @click="picker.onCellClick(props.date, props.kind)"
  >
    <slot>{{ fallbackLabel }}</slot>
  </div>
</template>
