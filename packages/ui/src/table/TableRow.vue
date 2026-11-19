<script setup lang="ts">
import { computed, provide } from 'vue';

import { useComponentContext } from '../context';

import type { TableRowEmits, TableRowProps, TableRowContext } from './types';

/**
 * 一行。表头 / 表尾 / 表体共用。
 *
 * 传入 item（表体数据行）时绑定选中 / 展开 / 禁用态并派发行事件；表头与汇总行
 * 不传 item，渲染为纯结构 tr。行事件只在有 item 时发出，避免表头点击冒泡成行点击。
 * 同时向内部 TableCell 下发行级上下文，单元格合并跨度据此自动派生。
 */
const props = defineProps<TableRowProps>();

const emit = defineEmits<TableRowEmits>();

const table = useComponentContext('table');

provide<TableRowContext>('tableRow', { item: computed(() => props.item) });

const rowProps = computed(() =>
  props.item && props.item.type === 'data' ? table.getRowProps(props.item) : {}
);

function onClick(event: MouseEvent): void {
  if (props.item) emit('rowClick', props.item, event);
}

function onDblclick(event: MouseEvent): void {
  if (props.item) emit('rowDblclick', props.item, event);
}
</script>

<template>
  <tr data-part="row" v-bind="rowProps" @click="onClick" @dblclick="onDblclick">
    <slot />
  </tr>
</template>