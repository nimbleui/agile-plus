<script setup lang="ts">
import { computed } from 'vue';

import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '@agile-plus/ui/slider';

import type { SliderRootEmits } from '@agile-plus/ui/slider';

import type { SliderProps } from './types';

/**
 * 带样式的滑块。
 *
 * 预置 Root / Track / Range / Thumb 四段结构，thumb 数量跟随 `value` 或
 * `defaultValue` 的长度：一个值一个 thumb，两个值即范围滑块。
 *
 * 单 thumb 请同时提供 `thumb-labels`，例如 `:thumb-labels="['音量']"`。
 * 外观由 `data-orientation` 与 `data-disabled` 驱动，不额外提供 size / variant。
 *
 * 需要 `asChild` 或自定义部件结构时，直接使用 UI 层的 SliderRoot / SliderTrack /
 * SliderRange / SliderThumb；本封装固定为四段结构，无法把多个子部件合并成一个元素。
 */
const props = withDefaults(defineProps<SliderProps>(), {
  value: undefined,
  defaultValue: undefined,
  min: 0,
  max: 100,
  step: 1,
  minStepsBetweenThumbs: 0,
  preserveThumbOrder: false,
  orientation: 'horizontal',
  dir: 'ltr',
  inverted: false,
  disabled: false,
  name: undefined,
  form: undefined,
  as: 'span',
  thumbLabels: undefined,
});

const emit = defineEmits<SliderRootEmits>();

const rootProps = computed(() => ({
  value: props.value,
  defaultValue: props.defaultValue,
  min: props.min,
  max: props.max,
  step: props.step,
  minStepsBetweenThumbs: props.minStepsBetweenThumbs,
  preserveThumbOrder: props.preserveThumbOrder,
  orientation: props.orientation,
  dir: props.dir,
  inverted: props.inverted,
  disabled: props.disabled,
  name: props.name,
  form: props.form,
  as: props.as,
}));

const thumbCount = computed(() => {
  const source = props.value ?? props.defaultValue;

  return Math.max(1, source?.length ?? 1);
});

/**
 * 只为显式提供的标签生成 attrs。
 *
 * 直接把 `undefined` 绑给 `aria-label` 会覆盖 useSlider 为多 thumb 生成的默认标签。
 */
function getThumbLabelAttrs(index: number): Record<string, string> {
  const label = props.thumbLabels?.[index];

  return label ? { 'aria-label': label } : {};
}
</script>

<template>
  <SliderRoot
    v-bind="rootProps"
    class="y-slider"
    @update:value="(value) => emit('update:value', value)"
    @value-commit="(value) => emit('value-commit', value)"
  >
    <SliderTrack class="y-slider__track">
      <SliderRange class="y-slider__range" />
    </SliderTrack>

    <SliderThumb
      v-for="index in thumbCount"
      :key="index"
      :index="index - 1"
      v-bind="getThumbLabelAttrs(index - 1)"
      class="y-slider__thumb"
    />
  </SliderRoot>
</template>

<style lang="scss">
@use './Slider.scss';
</style>
