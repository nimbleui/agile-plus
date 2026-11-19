<script setup lang="ts">
import { computed, watch } from 'vue';

import { usePresence } from '@agile-plus/headless';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { AccordionContentProps } from './types';

/**
 * 手风琴项的内容区。
 *
 * 与 CollapsibleContent 同一套机制：Presence 决定退场动画期间是否留在 DOM，
 * 展开 / Presence / 元素变化后的 post 阶段测量自然高度写成 CSS 变量，供样式层
 * `@keyframes` 做高度动画。测量与属性表都复用项内部的 Collapsible 实例，不另写一套。
 */
const props = withDefaults(defineProps<AccordionContentProps>(), {
  forceMount: false,
  as: 'div',
  asChild: false,
});

const item = useComponentContext('accordionItem');

const collapsible = item.collapsible;

const presence = usePresence({
  present: () => props.forceMount === true || collapsible.isOpen.value,
});

const isOpenOrExiting = computed(() => collapsible.isOpen.value || presence.isPresent.value);

const contentAttrs = computed(() => collapsible.getContentAttrs(presence.isPresent.value));

const contentVars = computed(() => collapsible.getContentVars());

/**
 * 内容元素入口必须同时交给 Presence 与测量：Presence 靠这个元素读 computed
 * animation-name 判定退场动画是否还在跑，只绑测量入口会让 Presence 的元素恒为 null，
 * 退场永远被判成「无动画」而瞬间卸载——收起就没有过渡。与 PopoverContent 等同一个写法。
 */
function setContentElement(node: unknown): void {
  presence.setElement(node);
  collapsible.setContentElement(node);
}

watch(
  [() => collapsible.isOpen.value, presence.isPresent, collapsible.contentElement],
  () => {
    // 只在展开时测量：退场关键帧的起点高度沿用展开时测得的变量。收起阶段再测量，
    // getBoundingClientRect 强制样式 flush 会取消刚起步的退场动画，Presence 把这次
    // cancel 当成退场结束而瞬间卸载——收起就没有过渡。
    if (collapsible.isOpen.value) collapsible.measureContent();
  },
  { flush: 'post' }
);
</script>

<template>
  <Slot
    v-if="presence.isPresent.value"
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="setContentElement"
    v-bind="contentAttrs"
    :style="contentVars"
    data-part="content"
  >
    <slot v-if="isOpenOrExiting" :open="collapsible.isOpen" />
  </Slot>
</template>