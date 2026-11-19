<script setup lang="ts">
import { computed } from 'vue';

import { useKeepMounted, usePresence } from '@agile-plus/headless';

import { parsePlacement } from '@agile-plus/primitives/floating';

import { useComponentContext } from '../context';

import type { TooltipContentProps } from './types';

/**
 * Tooltip 内容。
 *
 * portal 到 body（可换容器），避免被祖先的 overflow / transform 裁剪或改变定位上下文。
 * 是否留在 DOM 由共享的 usePresence 决定：给了退场动画就等动画结束再卸载。
 * `keepMounted` 让内容打开过一次之后常驻，`forceMount` 完全接管进出场——
 * 两种常驻都要由样式层负责把 closed 状态藏干净。
 *
 * 定位样式是测量结果，必须内联；这与「无样式层零视觉样式」不冲突——
 * 它只表达位置，颜色、圆角、阴影仍由样式层负责。
 */
// Teleport 不是真实元素，class 与 style 必须显式绑到内部 div。
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<TooltipContentProps>(), {
  container: 'body',
  forceMount: false,
  keepMounted: false,
});

const tooltip = useComponentContext('tooltip');

const retention = useKeepMounted({ open: tooltip.isOpen, enabled: () => props.keepMounted });

const presence = usePresence({
  present: () => props.forceMount || retention.keepMounted.value || tooltip.isOpen.value,
});

const contentProps = computed(() => tooltip.getContentProps());

/** 实际所在边：翻转后可能与请求的 placement 不同，样式层据此决定箭头贴哪条边。 */
const side = computed(() => parsePlacement(tooltip.floating.placement.value).side);

/**
 * 一个元素要同时交给 presence 与 floating，而 :ref 只能绑一个，
 * 因此用函数 ref 分发。presence 需要它判动画，floating 需要它量尺寸。
 */
function setContentElement(node: unknown): void {
  presence.setElement(node);
  tooltip.floating.floatingRef.value = node instanceof HTMLElement ? node : null;
}
</script>

<template>
  <Teleport :to="props.container">
    <div
      v-if="presence.isPresent.value"
      :ref="setContentElement"
      v-bind="{ ...contentProps, ...$attrs }"
      :style="tooltip.floating.floatingStyle.value"
      :data-side="side"
      data-part="content"
      @pointerenter="tooltip.onContentPointerEnter"
      @pointerleave="tooltip.onContentPointerLeave"
    >
      <slot />
    </div>
  </Teleport>
</template>
