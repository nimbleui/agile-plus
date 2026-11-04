<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useSlider } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { SliderRootEmits, SliderRootProps } from './types';

/**
 * Slider 根组件。
 *
 * 不渲染自己的布局容器，只把 useSlider 的 API 通过 provide 分发给 Track / Range /
 * Thumb，并渲染表单提交所需的隐藏 input。指针位置以本组件注册的根元素矩形为准，
 * 与 Radix 使用 Slider Root 而不是 Track 测量一致。
 *
 * 隐藏 input 是本组件的兄弟节点而不是 Slot 的子节点：asChild 时 Slot 仍然只接收
 * 一个元素子节点，input 不会被错误地合并进消费者提供的元素。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SliderRootProps>(), {
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
  asChild: false,
});

const emit = defineEmits<SliderRootEmits>();

const slider = useSlider({
  value: toRef(() => props.value),
  defaultValue: props.defaultValue,
  min: toRef(() => props.min),
  max: toRef(() => props.max),
  step: toRef(() => props.step),
  minStepsBetweenThumbs: toRef(() => props.minStepsBetweenThumbs),
  preserveThumbOrder: toRef(() => props.preserveThumbOrder),
  orientation: toRef(() => props.orientation),
  dir: toRef(() => props.dir),
  inverted: toRef(() => props.inverted),
  disabled: toRef(() => props.disabled),
  name: toRef(() => props.name),
  form: toRef(() => props.form),
  onValueChange: (value) => emit('update:value', value),
  onValueCommit: (value) => emit('value-commit', value),
});

provide('slider', slider);
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="slider.setRootElement"
    v-bind="{ ...slider.getRootProps(), ...$attrs }"
    @pointerdown="slider.onRootPointerDown"
  >
    <slot />
  </Slot>

  <input
    v-for="input in slider.getHiddenInputs()"
    :key="input.index"
    type="text"
    :name="input.name"
    :value="input.value"
    :form="input.form"
    aria-hidden="true"
    tabindex="-1"
    style="display: none"
  />
</template>
