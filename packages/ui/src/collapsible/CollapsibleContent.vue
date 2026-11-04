<script setup lang="ts">
import { computed, watch } from 'vue';

import { usePresence } from '@agile-plus/headless';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { CollapsibleContentProps } from './types';

/**
 * 折叠区内容。
 *
 * 是否留在 DOM 由共享的 `usePresence` 决定：给了 `@keyframes` 退场动画时等动画结束再
 * 卸载，没有动画时当帧卸载（与接入前行为一致）。`forceMount` 时 Presence 恒为 present。
 *
 * 尺寸测量在「展开状态、Presence、元素」三者任一变化后的 post 阶段执行：此时 DOM 已
 * 补丁完，量到的才是这一帧的自然高度；量出来的宽高写成 CSS 变量，供样式层的
 * `@keyframes` 做高度动画。
 *
 * `hidden` 与 children 的渲染都看「展开或仍在退场」：退场动画期间内容必须还在，
 * 否则动画播的是一个空盒子。
 */
const props = withDefaults(defineProps<CollapsibleContentProps>(), {
  forceMount: false,
  as: 'div',
  asChild: false,
});

const collapsible = useComponentContext('collapsible');

const presence = usePresence({
  present: () => props.forceMount === true || collapsible.isOpen.value,
});

const isOpenOrExiting = computed(() => collapsible.isOpen.value || presence.isPresent.value);

const contentAttrs = computed(() => collapsible.getContentAttrs(presence.isPresent.value));

const contentVars = computed(() => collapsible.getContentVars());

watch(
  [() => collapsible.isOpen.value, presence.isPresent, collapsible.contentElement],
  () => collapsible.measureContent(),
  { flush: 'post' }
);
</script>

<template>
  <Slot
    v-if="presence.isPresent.value"
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="collapsible.setContentElement"
    v-bind="contentAttrs"
    :style="contentVars"
    data-part="content"
  >
    <slot v-if="isOpenOrExiting" :open="collapsible.isOpen" />
  </Slot>
</template>
