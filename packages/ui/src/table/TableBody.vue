<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import type { TableBodyRow } from '@agile-plus/primitives/table';

/**
 * 表体容器。
 *
 * 默认插槽把 headless 算好的表体行序列交回，消费者 v-for 它：
 * 数据行用 TableRow，展开内容行用 TableExpandedRow，空态用 TableEmpty。
 */
const table = useComponentContext('table');

defineSlots<{
  default(props: { rows: TableBodyRow[] }): unknown;
}>();

const slotProps = computed(() => ({ rows: table.rows.value }));
</script>

<template>
  <tbody data-part="body">
    <slot v-bind="slotProps" />
  </tbody>
</template>