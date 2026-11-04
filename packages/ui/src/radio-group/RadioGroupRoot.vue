<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useRadioGroup } from '@agile-plus/headless';
import type { UseRadioGroupReturn } from '@agile-plus/headless';

import type { RadioGroupRootEmits, RadioGroupRootProps } from './types';

/**
 * RadioGroup 根组件，作为复合组件的上下文提供者。
 *
 * 渲染 role="radiogroup" 容器，通过 provide/inject 把 API 分发给
 * RadioGroupItem 与 RadioGroupIndicator。支持 v-model 双向绑定选中值。
 */
const props = withDefaults(defineProps<RadioGroupRootProps>(), {
  defaultValue: '',
  disabled: false,
  required: false,
  loop: true,
  orientation: 'horizontal',
});

const emit = defineEmits<RadioGroupRootEmits>();

// 受控与可选参数都以 getter 传入，避免展开快照导致外部变化无法回流。
const radioGroup = useRadioGroup({
  ...props,
  modelValue: toRef(() => props.modelValue),
  disabled: toRef(() => props.disabled),
  required: toRef(() => props.required),
  orientation: toRef(() => props.orientation),
  ariaLabelledby: toRef(() => props.ariaLabelledby),
  ariaDescribedby: toRef(() => props.ariaDescribedby),
  name: toRef(() => props.name),
  onValueChange: (value) => emit('update:modelValue', value),
});

provide('radioGroup', radioGroup);

defineExpose({
  value: radioGroup.value,
  setValue: radioGroup.setValue,
} satisfies Partial<UseRadioGroupReturn>);
</script>

<template>
  <div v-bind="radioGroup.getRootProps()">
    <slot />
  </div>
</template>
