<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import DateRangePickerCell from './DateRangePickerCell.vue';

import type { DateCell } from '@agile-plus/primitives/date';

import type { DateRangePickerGridProps } from './types';

/**
 * DateRangePicker 的一侧月网格：星期表头 + 6 行格子。
 *
 * 与 DatePickerGrid 的结构同构，差异只在数据源（左 / 右面板）与格子多了
 * 悬停预览事件。行结构（role="row"）由本部件生成，成品层只通过 cell 插槽
 * 决定格子的视觉内容，不碰无障碍结构。
 */
const props = withDefaults(defineProps<DateRangePickerGridProps>(), {
  side: 'left',
});

defineSlots<{
  /** 单个格子的内容；不写则渲染「几号」 */
  cell(props: { cell: DateCell }): unknown;
}>();

const picker = useComponentContext('dateRangePicker');

const cells = computed<DateCell[]>(() =>
  props.side === 'left' ? picker.leftCells.value : picker.rightCells.value
);

const rows = computed<DateCell[][]>(() => {
  const result: DateCell[][] = [];

  for (let index = 0; index < cells.value.length; index += 7) {
    result.push(cells.value.slice(index, index + 7));
  }

  return result;
});

const gridProps = computed(() => picker.getGridProps(props.side));
</script>

<template>
  <div v-bind="gridProps" data-part="grid" @pointerleave="picker.onCellPointerLeave">
    <div role="row" data-part="weekdays">
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
      <DateRangePickerCell
        v-for="cell in row"
        :key="cell.date.getTime()"
        :date="cell.date"
        :side="props.side"
      >
        <template v-if="$slots.cell" #default>
          <slot name="cell" :cell="cell" />
        </template>
      </DateRangePickerCell>
    </div>
  </div>
</template>
