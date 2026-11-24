<script setup lang="ts" generic="T">
import { computed, toRef, useAttrs } from 'vue';

import { useVirtualList } from '@agile-plus/headless';

import type { CSSProperties, PropType } from 'vue';

import type { UseVirtualListReturn, VirtualListItemKey } from '@agile-plus/headless';

/**
 * 动态高度虚拟列表（无样式层）。
 *
 * 结构只有两层：viewport 是滚动容器本身，content 只承担上下 padding。渲染区间由无头层按
 * Fenwick 树上的累计高度算出，行节点默认用 `:key="index"`；传 `itemKey` 后高度与 DOM 都按数据
 * 身份复用，重排不会把上一项的高度或行内状态带给下一项。
 *
 * 三段必须写在这里的功能性内联样式：viewport 的 `overflow-y`（没有它就滚不起来，行为不成立）、
 * content 的上下 padding（区间外的累计高度，就是定位机制本身）、content 的
 * `box-sizing: content-box`（padding 必须加在内容之外；宿主把全局设成 border-box 时，
 * 一旦生效总高就少算一屏，而这不会被测量发现）。颜色、字号、行内边距仍归样式层。
 *
 * content 不设显式 height：flow 布局下「上 padding + 各行实际高 + 下 padding」已经等于总高，
 * 再钉一个 height 会把渲染行算两遍。`totalSize` 仍通过 expose 提供给需要算滚动行程的消费者。
 *
 * 可访问性：content 是 `role="list"`，行是 `role="listitem"` 并带 aria-posinset / aria-setsize，
 * 只渲染片段时读屏仍能报出「第 3 项，共 10000 项」而不是「共 8 项」。
 */
defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

/** 语义属性属于 role=list 的 content，其余透传属性仍落在滚动根节点。 */
const viewportAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([name]) => !name.startsWith('aria-')))
);

const contentAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([name]) => name.startsWith('aria-')))
);

const props = defineProps({
  items: { type: Array as PropType<readonly T[]>, default: () => [] as readonly T[] },
  itemKey: {
    type: Function as PropType<(item: T, index: number) => VirtualListItemKey>,
    default: undefined,
  },
  estimateSize: { type: Number, default: undefined },
  overscan: { type: Number, default: undefined },
  height: { type: [String, Number] as PropType<string | number>, default: undefined },
});

const list = useVirtualList({
  count: toRef(() => props.items.length),
  getItemKey: itemKeyAt,
  estimateSize: toRef(() => props.estimateSize),
  overscan: toRef(() => props.overscan),
});

function itemKeyAt(index: number): VirtualListItemKey {
  return props.itemKey ? props.itemKey(props.items[index], index) : index;
}

/** 数字按 px 处理，字符串原样交给 CSS，避免在本层猜单位。 */
const viewportStyle = computed<CSSProperties>(() => ({
  overflowY: 'auto',
  ...(props.height === undefined
    ? null
    : { height: typeof props.height === 'number' ? `${props.height}px` : props.height }),
}));

const contentStyle = computed<CSSProperties>(() => ({
  boxSizing: 'content-box',
  paddingTop: list.paddingTop.value,
  paddingBottom: list.paddingBottom.value,
}));

defineExpose({
  startIndex: list.startIndex,
  endIndex: list.endIndex,
  visibleIndices: list.visibleIndices,
  totalSize: list.totalSize,
  scrollTop: list.scrollTop,
  viewportSize: list.viewportSize,
  scrollToIndex: list.scrollToIndex,
  scrollIntoView: list.scrollIntoView,
  scrollToOffset: list.scrollToOffset,
  invalidateMeasurements: list.invalidateMeasurements,
} satisfies Partial<UseVirtualListReturn>);
</script>

<template>
  <div
    v-bind="viewportAttrs"
    :ref="list.setViewportElement"
    data-part="viewport"
    :style="viewportStyle"
  >
    <div
      v-bind="contentAttrs"
      :ref="list.setContentElement"
      data-part="content"
      role="list"
      :style="contentStyle"
    >
      <div
        v-for="index in list.visibleIndices.value"
        :key="itemKeyAt(index)"
        data-part="row"
        role="listitem"
        :aria-posinset="index + 1"
        :aria-setsize="props.items.length"
      >
        <slot :item="props.items[index]" :index="index" />
      </div>
    </div>
  </div>
</template>
