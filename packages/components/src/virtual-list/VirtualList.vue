<script setup lang="ts" generic="T">
import { computed, ref } from 'vue';

import { VirtualList as VirtualListPrimitive } from '@agile-plus/ui/virtual-list';

import type { VirtualListHandle, VirtualListProps } from './types';

/**
 * 带样式的虚拟列表。
 *
 * 泛型跟着 `items` 走，默认插槽拿到的 `item` 就是数组元素类型：本层是消费者实际使用的入口，
 * 把类型退化成 `unknown` 等于让每一行都要断言一次（与无样式层同一取舍，理由见 ui 层注释）。
 *
 * 行内容走**带作用域的默认插槽**而不是具名插槽：这一格每个可见行渲染一次，是列表唯一的
 * 内容分发点，再起个 `row` 的名字只会多出两种写法说同一件事。
 *
 * 本层只加排版与分隔线：`overflow-y`、上下 padding、`box-sizing` 这三段功能性样式由无样式层
 * 内联产出，把它们抄一遍会产生两个真源，而其中任一处失效都会让定位算错。
 *
 * 只转发四个动作（顶部跳转、最小位移可见、内容坐标跳转、重测）。区间状态不从这里读：需要「接近底部加载更多」这类判断的消费者
 * 用 ui 层组件或直接绑 `useVirtualList`，那里的 `scrollTop` / `viewportSize` 是现成的。
 */
const props = withDefaults(defineProps<VirtualListProps<T>>(), {
  items: () => [],
  itemKey: undefined,
  estimateSize: undefined,
  overscan: undefined,
  height: undefined,
});

const listHandle = ref<VirtualListHandle | null>(null);

const rootProps = computed(() => ({
  items: props.items,
  itemKey: props.itemKey,
  estimateSize: props.estimateSize,
  overscan: props.overscan,
  height: props.height,
}));

// 挂载前 ref 还是 null，此时列表也没有可滚动的容器，跳过比抛错更符合调用时机。
defineExpose({
  scrollToIndex: (index: number) => listHandle.value?.scrollToIndex(index),
  scrollIntoView: (index: number) => listHandle.value?.scrollIntoView(index),
  scrollToOffset: (offset: number) => listHandle.value?.scrollToOffset(offset),
  invalidateMeasurements: () => listHandle.value?.invalidateMeasurements(),
});
</script>

<template>
  <VirtualListPrimitive ref="listHandle" v-bind="rootProps" class="y-virtual-list">
    <template #default="rowProps">
      <slot v-bind="rowProps" />
    </template>
  </VirtualListPrimitive>
</template>

<style lang="scss">
@use './VirtualList.scss';
</style>
