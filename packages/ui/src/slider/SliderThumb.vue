<script setup lang="ts">
import { computed, useAttrs } from 'vue';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { StyleValue } from 'vue';

import type { SliderThumbProps } from './types';

/**
 * Slider 可拖拽的 thumb。
 *
 * 百分比位置、贴边偏移与焦点管理来自 useSlider；横向/纵向的交叉轴居中由样式层
 * 用独立的 `translate` 属性完成，避免覆盖这里的 `transform` 位移。
 *
 * 单个 thumb 没有自动读屏标签，调用方需通过 `aria-label` 或 `aria-labelledby`
 * 给出业务含义；两个及以上 thumb 会得到“最小值/最大值”等默认标签。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SliderThumbProps>(), {
  index: 0,
  as: 'span',
  asChild: false,
});

const slider = useComponentContext('slider');

const attrs = useAttrs();

const thumbProps = computed(() => slider.getThumbProps(props.index));

function getMergedThumbStyle(): StyleValue {
  return [slider.getThumbStyle(props.index), attrs.style as StyleValue | undefined];
}

function setThumbElement(node: unknown): void {
  slider.setThumbElement(props.index, node);
}
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="setThumbElement"
    v-bind="{ ...thumbProps, ...attrs }"
    :style="getMergedThumbStyle()"
    @pointerdown="slider.onThumbPointerDown($event, props.index)"
    @keydown="slider.onThumbKeydown($event, props.index)"
    @focus="slider.onThumbFocus(props.index)"
  >
    <slot />
  </Slot>
</template>
