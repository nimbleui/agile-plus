<script setup lang="ts">
import { useAttrs } from 'vue';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { StyleValue } from 'vue';

import type { SliderRangeProps } from './types';

/**
 * Slider 已填充区间。
 *
 * 单 thumb 从最小值画到 thumb；多 thumb 从最小 thumb 画到最大 thumb。
 * 四条定位边由 primitives 折算好 RTL / inverted / 纵向，样式层不再判断方向。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SliderRangeProps>(), {
  as: 'span',
  asChild: false,
});

const slider = useComponentContext('slider');

const attrs = useAttrs();

function getMergedRangeStyle(): StyleValue {
  return [slider.getRangeStyle(), attrs.style as StyleValue | undefined];
}
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...slider.getRangeProps(), ...attrs }"
    :style="getMergedRangeStyle()"
  >
    <slot />
  </Slot>
</template>
