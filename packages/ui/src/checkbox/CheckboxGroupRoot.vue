<script setup lang="ts">
import { computed, provide, toRef } from 'vue';

import { useCheckboxGroup } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { CheckboxGroupRootEmits, CheckboxGroupRootProps } from './types';

/**
 * CheckboxGroup 根组件。
 *
 * 持有一个值数组并向组内 CheckboxRoot 提供上下文，本身只负责排列与无障碍分组
 * （role="group"）。支持 v-model 双向绑定值集合。
 */
const props = withDefaults(defineProps<CheckboxGroupRootProps>(), {
  // 数组默认值必须用工厂函数返回，否则多个实例会共享同一个数组引用。
  defaultValue: () => [],
  disabled: false,
  required: false,
  as: 'div',
});

const emit = defineEmits<CheckboxGroupRootEmits>();

// Slot 自身不继承 attrs，消费者传入的 class / style 必须显式并入。
defineOptions({ inheritAttrs: false });

const group = useCheckboxGroup({
  modelValue: toRef(() => props.modelValue),
  defaultValue: props.defaultValue,
  onValueChange: (values) => emit('update:modelValue', values),
  disabled: toRef(() => props.disabled),
  required: toRef(() => props.required),
  name: toRef(() => props.name),
  ariaLabelledby: toRef(() => props.ariaLabelledby),
  ariaDescribedby: toRef(() => props.ariaDescribedby),
});

provide('checkboxGroup', group);

const rootProps = computed(() => group.getRootProps());

defineExpose({
  values: group.values,
  setValues: group.setValues,
});
</script>

<template>
  <Slot :as="props.as" v-bind="{ ...rootProps, ...$attrs }">
    <slot />
  </Slot>
</template>
