<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import DatePickerCell from './DatePickerCell.vue';

import type { DateCell } from '@agile-plus/primitives/date';

import type { DatePickerGridProps } from './types';

/**
 * DatePicker 的网格：表头星期行 + 若干行格子，role / aria 结构全部在这里。
 *
 * 日期网格 7 列 6 行，月份 / 年代网格 3 列 4 行；行结构（role="row"）由本部件
 * 生成，成品层只通过 cell 插槽决定格子的视觉内容，不碰无障碍结构。
 */
const props = withDefaults(defineProps<DatePickerGridProps>(), {
  kind: 'date',
});

defineSlots<{
  /** 单个格子的内容；不写则渲染默认文本（几号 / 几月 / 年份） */
  cell(props: { cell: DateCell }): unknown;
}>();

const picker = useComponentContext('datePicker');

const columns = computed(() => (props.kind === 'date' ? 7 : 3));

const cells = computed<DateCell[]>(() => {
  if (props.kind === 'month') return picker.monthCells.value;

  if (props.kind === 'year') return picker.yearCells.value;

  return picker.dateCells.value;
});

const rows = computed<DateCell[][]>(() => {
  const result: DateCell[][] = [];

  for (let index = 0; index < cells.value.length; index += columns.value) {
    result.push(cells.value.slice(index, index + columns.value));
  }

  return result;
});

const gridProps = computed(() => picker.getGridProps(props.kind));
</script>

<template>
  <div v-bind="gridProps" data-part="grid">
    <div v-if="props.kind === 'date'" role="row" data-part="weekdays">
      <span
        v-for="label in picker.weekdayLabels.value"
        :key="label"
        role="columnheader"
        data-part="weekday"
      >
        {{ label }}
      </span>
    </div>

    <div v-for="(row, index) in rows" :key="index" role="row" data-part="row">
      <DatePickerCell
        v-for="cell in row"
        :key="cell.date.getTime()"
        :date="cell.date"
        :kind="props.kind"
      >
        <template v-if="$slots.cell" #default>
          <slot name="cell" :cell="cell" />
        </template>
      </DatePickerCell>
    </div>
  </div>
</template>
