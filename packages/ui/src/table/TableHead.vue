<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import type { TableHeadProps } from './types';

/**
 * 表头单元格。
 *
 * column 引用列模型的 key：可排序列把内容包进一个按钮，点击推进排序循环，
 * aria-sort 落在 th 上、三态 data-order 落在按钮上，读屏与样式各取所需。
 * 不可排序列直接渲染插槽内容，缺省文案取列模型的 title。
 *
 * 启用 resizable 时在右缘渲染拖拽手柄：按下时量好 th 的像素宽度交给 headless，
 * 移动换算与监听生命周期都在 headless 收口，本层只负责量起点与触发动作。
 */
const props = defineProps<TableHeadProps>();

const table = useComponentContext('table');

const column = computed(() => table.columns.value.find((item) => item.key === props.column));

const isSortable = computed(() => column.value?.sortable === true);

const isResizable = computed(() => table.resizable.value && props.column !== undefined);

const headProps = computed(() => table.getHeadProps(props.column ?? ''));

const sortProps = computed(() => table.getSortTriggerProps(props.column ?? ''));

function onSort(): void {
  if (props.column !== undefined) table.toggleSort(props.column);
}

function onResizeStart(event: PointerEvent): void {
  if (props.column === undefined) return;

  const handle = event.currentTarget;
  const th = handle instanceof HTMLElement ? handle.closest('th') : null;
  const startWidth = th instanceof HTMLElement ? th.offsetWidth : 0;

  // 阻止按下引发的文本选择，拖拽期间的全局光标由样式层按 data-resizing 接管。
  event.preventDefault();

  table.startColumnResize(props.column, event.clientX, startWidth);
}
</script>

<template>
  <th data-part="head" v-bind="headProps">
    <button v-if="isSortable" type="button" data-part="sort" v-bind="sortProps" @click="onSort">
      <slot>{{ column?.title }}</slot>
      <span data-part="sort-indicator" aria-hidden="true" />
    </button>

    <slot v-else>{{ column?.title }}</slot>

    <span
      v-if="isResizable"
      data-part="resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="拖拽调整列宽"
      @pointerdown="onResizeStart"
    />
  </th>
</template>