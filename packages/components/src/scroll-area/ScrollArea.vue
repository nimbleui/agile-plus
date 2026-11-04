<script setup lang="ts">
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@agile-plus/ui/scroll-area';

import type { ScrollAreaRootProps } from '@agile-plus/ui';

/**
 * 带样式的自定义滚动条容器，五个部件按 Radix 的结构预置好。
 *
 * 根容器需要显式高度（或 max-height）：视口用 height: 100% 撑满父级，
 * 没有确定高度时不会产生溢出，也就不会出现滚动条。
 */
const props = withDefaults(defineProps<ScrollAreaRootProps>(), {
  type: 'hover',
  scrollHideDelay: 600,
  as: 'div',
  asChild: false,
});
</script>

<template>
  <ScrollAreaRoot v-bind="props" class="y-scroll-area">
    <ScrollAreaViewport class="y-scroll-area__viewport">
      <slot />
    </ScrollAreaViewport>

    <ScrollAreaScrollbar orientation="vertical" class="y-scroll-area__scrollbar">
      <ScrollAreaThumb class="y-scroll-area__thumb" />
    </ScrollAreaScrollbar>

    <ScrollAreaScrollbar orientation="horizontal" class="y-scroll-area__scrollbar">
      <ScrollAreaThumb class="y-scroll-area__thumb" />
    </ScrollAreaScrollbar>

    <ScrollAreaCorner class="y-scroll-area__corner" />
  </ScrollAreaRoot>
</template>

<style lang="scss">
@use './ScrollArea.scss';
</style>
