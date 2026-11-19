<script setup lang="ts">
import { computed, provide, toRef } from 'vue';

import { useTable } from '@agile-plus/headless';

import type { UseTableReturn } from '@agile-plus/headless';

import type { TableRootEmits, TableRootProps, TableRootSlotProps } from './types';

/**
 * 表格的根节点，同时是这一组部件的状态宿主。
 *
 * 外层 div 是滚动容器的结构落点：固定表头要求 table 落在一个可滚动的盒子里，
 * 样式层在 [data-part='root'] 上设置 overflow 与高度，UI 层只给出结构不做任何视觉。
 * 数据与列模型逐项转成 getter 再交给 headless——它们会随接口返回变化，
 * 裸展开会固化成 setup 时的快照；rowKey 与 default* 保持快照，理由见 headless 类型。
 */
const props = withDefaults(defineProps<TableRootProps>(), {
  data: () => [],
  columns: () => [],
  rowKey: undefined,
  selection: false,
  isRowSelectable: undefined,
  expandable: false,
  resizable: false,
  spanMethod: undefined,
  sort: undefined,
  defaultSort: undefined,
  selectedKeys: undefined,
  defaultSelectedKeys: undefined,
  expandedKeys: undefined,
  defaultExpandedKeys: undefined,
  ariaLabel: undefined,
});

const emit = defineEmits<TableRootEmits>();

const table = useTable({
  data: toRef(() => props.data),
  columns: toRef(() => props.columns),
  rowKey: props.rowKey,
  selection: toRef(() => props.selection),
  isRowSelectable: props.isRowSelectable,
  expandable: toRef(() => props.expandable),
  resizable: toRef(() => props.resizable),
  spanMethod: props.spanMethod,
  onColumnResize: (key, width) => emit('columnResize', key, width),
  sort: toRef(() => props.sort),
  defaultSort: props.defaultSort,
  onSortChange: (value) => emit('update:sort', value),
  selectedKeys: toRef(() => props.selectedKeys),
  defaultSelectedKeys: props.defaultSelectedKeys,
  onSelectedKeysChange: (value) => emit('update:selectedKeys', value),
  expandedKeys: toRef(() => props.expandedKeys),
  defaultExpandedKeys: props.defaultExpandedKeys,
  onExpandedKeysChange: (value) => emit('update:expandedKeys', value),
});

provide<UseTableReturn>('table', table);

defineSlots<{
  default(props: TableRootSlotProps): unknown;
}>();

const slotProps = computed<TableRootSlotProps>(() => ({
  rows: table.rows.value,
  columns: table.columns.value,
  sort: table.sort.value,
  selectedKeys: table.selectedKeys.value,
  expandedKeys: table.expandedKeys.value,
  columnWidths: table.columnWidths.value,
  layout: table.layout.value,
}));

defineExpose(table);
</script>

<template>
  <div data-part="root" :data-resizing="table.resizingKey.value ? '' : undefined">
    <table
      data-part="table"
      :aria-label="props.ariaLabel"
      :style="{ '--y-table-min-width': `${table.totalColumnWidth.value}px` }"
    >
      <slot v-bind="slotProps" />
    </table>
  </div>
</template>