<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { ScrollAreaThumbProps } from './types';

// Slot 自身不继承 attrs，消费者传入的 class 必须显式并入。
defineOptions({ inheritAttrs: false });

/**
 * 可拖拽的 thumb。
 *
 * 尺寸与位移由几何计算写成内联 style：它们是逐帧变化的测量结果，不适合放进样式层。
 * 朝向取自 Scrollbar 的上下文，消费者不需要重复声明一次。
 */
const props = withDefaults(defineProps<ScrollAreaThumbProps>(), {
  as: 'div',
  asChild: false,
});

const area = useComponentContext('scrollArea');
const scrollbar = useComponentContext('scrollAreaScrollbar');

// 顶层 computed 才会在模板里自动解包：直接用 scrollbar.orientation 会传进一个 Ref。
const orientation = computed(() => scrollbar.orientation.value);

function onPointerDown(event: PointerEvent): void {
  area.onThumbPointerDown(event, orientation.value);
}
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...area.getThumbProps(orientation), ...$attrs }"
    :style="area.getThumbStyle(orientation)"
    @pointerdown="onPointerDown"
  >
    <slot />
  </Slot>
</template>
