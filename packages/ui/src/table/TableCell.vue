<script setup lang="ts">
import { computed, inject } from 'vue';

import { useComponentContext } from '../context';

import type { TableCellProps, TableRowContext } from './types';

/**
 * 数据单元格。
 *
 * column 引用列模型的 key，对齐与固定列几何由此派生；内容由插槽完全决定，
 * 部件不替消费者读字段——取值是成品层的事，复合层只负责结构与状态。
 *
 * 合并两条路径：显式 rowspan / colspan 直接生效；否则在 Root 配了 spanMethod 时
 * 按所属行自动派生（row / rowIndex 缺省从 TableRow 下发的行级上下文取）。
 * 跨度为 0 的格子被相邻格吞并，整个 td 不渲染。
 */
const props = defineProps<TableCellProps>();

const table = useComponentContext('table');

const rowContext = inject<TableRowContext | undefined>('tableRow', undefined);

const row = computed(() => props.row ?? rowContext?.item.value?.row);

const rowIndex = computed(() => props.rowIndex ?? rowContext?.item.value?.index ?? 0);

const span = computed(() => {
  if (props.rowspan !== undefined || props.colspan !== undefined) {
    const rowspan = props.rowspan ?? 1;
    const colspan = props.colspan ?? 1;

    return { rowspan, colspan, removed: rowspan === 0 || colspan === 0 };
  }

  if (props.column !== undefined && row.value !== undefined) {
    return table.getCellSpan(row.value, props.column, rowIndex.value);
  }

  return { rowspan: 1, colspan: 1, removed: false };
});

const cellProps = computed(() => table.getCellProps(props.column ?? ''));
</script>

<template>
  <td
    v-if="!span.removed"
    data-part="cell"
    :rowspan="span.rowspan !== 1 ? span.rowspan : undefined"
    :colspan="span.colspan !== 1 ? span.colspan : undefined"
    v-bind="cellProps"
  >
    <slot />
  </td>
</template>