<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

import { useComponentContext } from '../context';

import type { ScrollAreaViewportProps } from './types';

/**
 * 真正发生滚动的容器。
 *
 * 用 `<component :is>` 而不是 Slot：本组件必须持有元素引用，滚动测量要读它的
 * clientHeight / scrollHeight；Slot 的 ref 只能拿到组件实例而非 DOM 元素，
 * 因此 Viewport 支持 as 换标签，但不提供 asChild。
 */
const props = withDefaults(defineProps<ScrollAreaViewportProps>(), {
  as: 'div',
});

const area = useComponentContext('scrollArea');

const el = ref<HTMLElement | null>(null);

watch(el, (value) => {
  area.viewportRef.value = value;
});

// 元素被替换或卸载时清空引用，避免测量读到已脱离文档的节点。
onBeforeUnmount(() => {
  area.viewportRef.value = null;
});
</script>

<template>
  <component
    :is="props.as"
    ref="el"
    v-bind="area.getViewportProps()"
    @scroll="area.onViewportScroll"
    @pointerenter="area.onViewportPointerEnter"
    @pointerleave="area.onViewportPointerLeave"
    @focusin="area.onViewportFocusin"
    @focusout="area.onViewportFocusout"
  >
    <slot />
  </component>
</template>
