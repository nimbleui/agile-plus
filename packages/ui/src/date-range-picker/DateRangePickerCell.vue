<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import type { DateRangePickerCellProps } from './types';

/**
 * DateRangePicker 的单个格子。
 *
 * role / aria / data-* 全部来自无头层的 getCellProps；pointerdown 被拦掉以把
 * 焦点留在活跃输入框上，pointerenter 驱动等待终点时的悬停预览，click 才点选。
 */
const props = withDefaults(defineProps<DateRangePickerCellProps>(), {
  side: 'left',
});

const picker = useComponentContext('dateRangePicker');

const cellProps = computed(() => picker.getCellProps(props.date, props.side));
</script>

<template>
  <div
    v-bind="cellProps"
    data-part="cell"
    @pointerdown="picker.onCellPointerDown"
    @pointerenter="picker.onCellPointerEnter(props.date)"
    @click="picker.pickDate(props.date)"
  >
    <slot>{{ props.date.getDate() }}</slot>
  </div>
</template>
