<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import type { TableEmptyProps } from './types';

/**
 * 空态行。
 *
 * 一个横跨所有列的单元格，colspan 缺省按列模型 + 选择列 + 展开列核算，
 * 保证空态文案占满整行而不是缩在第一列。消费者在表体行序列为空时渲染它。
 */
const props = defineProps<TableEmptyProps>();

const table = useComponentContext('table');

const span = computed(() => props.colspan ?? table.colSpan.value);
</script>

<template>
  <tr data-part="empty-row">
    <td data-part="empty-cell" :colspan="span">
      <slot>暂无数据</slot>
    </td>
  </tr>
</template>