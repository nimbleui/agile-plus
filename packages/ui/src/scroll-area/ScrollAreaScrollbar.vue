<script setup lang="ts">
import { computed, provide } from 'vue';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { ScrollAreaScrollbarProps } from './types';

// Slot 自身不继承 attrs，消费者传入的 class / style 必须显式并入。
defineOptions({ inheritAttrs: false });

/**
 * 滚动条轨道。
 *
 * 默认只在可见时存在，与 Radix 一致；需要自己处理进出场过渡时用 forceMount 常驻。
 * 朝向通过上下文下发给 Thumb，Thumb 才能取到对应维度的几何与可见性。
 */
const props = withDefaults(defineProps<ScrollAreaScrollbarProps>(), {
  orientation: 'vertical',
  forceMount: false,
  as: 'div',
  asChild: false,
});

const area = useComponentContext('scrollArea');

const orientation = computed(() => props.orientation);

provide('scrollAreaScrollbar', { orientation });

const shouldRender = computed(
  () => props.forceMount || area.getVisibility(orientation.value) === 'visible'
);
</script>

<template>
  <Slot
    v-if="shouldRender"
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...area.getScrollbarProps(orientation), ...$attrs }"
    @pointerenter="area.onScrollbarPointerEnter(orientation)"
    @pointerleave="area.onScrollbarPointerLeave(orientation)"
  >
    <slot />
  </Slot>
</template>
