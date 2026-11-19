<script setup lang="ts">
import { computed } from 'vue';

import { parsePlacement } from '@agile-plus/primitives/floating';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { PopoverArrowProps } from './types';

/**
 * Popover 箭头。
 *
 * 只消费 floating 算出的交叉轴偏移；贴浮层哪条边由 data-side 交给样式层决定，
 * 因为那是视觉形状（三角形朝向、边框拼接）而不是位置计算。
 *
 * 必须写在 PopoverContent 内部：偏移是相对浮层自身坐标系的。
 */
const props = withDefaults(defineProps<PopoverArrowProps>(), {
  as: 'span',
  asChild: false,
});

const popover = useComponentContext('popover');

const side = computed(() => parsePlacement(popover.floating.placement.value).side);
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :style="popover.floating.arrowStyle.value"
    :data-side="side"
    data-part="arrow"
    aria-hidden="true"
  >
    <slot />
  </Slot>
</template>
