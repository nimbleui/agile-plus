<script setup lang="ts">
import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { SelectViewportProps } from './types';

/**
 * Select 的滚动视口。
 *
 * 列表的最大高度由样式层读 `--y-select-content-available-height` 限制，超出部分在这里
 * 滚动。键盘高亮项的滚动跟随由无头层直接写本元素的 scrollTop——不用 scrollIntoView，
 * 后者会连带滚动所有可滚动祖先，浮层被 portal 到 body 时会把整个页面也滚一段。
 *
 * 必须写在 SelectContent 内部：滚动容器与定位容器分开，定位的 transform 才不会随滚动抖动。
 */
const props = withDefaults(defineProps<SelectViewportProps>(), {
  as: 'div',
  asChild: false,
});

const select = useComponentContext('select');
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="select.setViewportElement"
    v-bind="select.getViewportProps()"
  >
    <slot />
  </Slot>
</template>
