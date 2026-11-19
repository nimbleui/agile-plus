<script setup lang="ts">
import { computed, provide, toRef } from 'vue';

import { usePagination } from '@agile-plus/headless';

import type { UsePaginationReturn } from '@agile-plus/headless';
import type { PaginationRootEmits, PaginationRootProps, PaginationRootSlotProps } from './types';

/**
 * 分页条的根节点，同时是这一组部件的状态宿主。
 *
 * 用 `nav` 而不是 `div`：APG 把分页定义为地标，屏幕阅读器才能一次跳到「分页」。
 * 几何参数逐项转成 getter 再交给 headless——`total` 会随搜索结果变化，裸展开会把
 * 它固化成 setup 时的快照。只有 `defaultValue` 保持快照，「起始值」本就只有初值有意义。
 */
const props = withDefaults(defineProps<PaginationRootProps>(), {
  modelValue: undefined,
  defaultValue: undefined,
  total: undefined,
  pageSize: undefined,
  pageCount: undefined,
  siblingCount: undefined,
  boundaryCount: undefined,
  disabled: false,
  ariaLabel: '分页',
});

const emit = defineEmits<PaginationRootEmits>();

const pagination = usePagination({
  modelValue: toRef(() => props.modelValue),
  defaultValue: props.defaultValue,
  total: toRef(() => props.total),
  pageSize: toRef(() => props.pageSize),
  pageCount: toRef(() => props.pageCount),
  siblingCount: toRef(() => props.siblingCount),
  boundaryCount: toRef(() => props.boundaryCount),
  disabled: toRef(() => props.disabled),
  onValueChange: (value) => emit('update:modelValue', value),
});

provide<UsePaginationReturn>('pagination', pagination);

defineSlots<{
  default(props: PaginationRootSlotProps): unknown;
}>();

/**
 * 插槽数据取的是 ref 的当前值而不是 ref 本身：调用侧写 `v-for="item in items"`
 * 时不应该再操心 `.value`。
 */
const slotProps = computed<PaginationRootSlotProps>(() => ({
  items: pagination.items.value,
  pageCount: pagination.pageCount.value,
  currentPage: pagination.currentPage.value,
}));

defineExpose(pagination);
</script>

<template>
  <nav data-part="root" :aria-label="props.ariaLabel">
    <slot v-bind="slotProps" />
  </nav>
</template>
