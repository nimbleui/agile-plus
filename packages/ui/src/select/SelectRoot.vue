<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useSelect } from '@agile-plus/headless';

import type { PropType } from 'vue';

import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy, SelectOptionSeed, UseSelectReturn } from '@agile-plus/headless';

/**
 * Select 根组件：只持有状态并下发上下文，不渲染任何元素。
 *
 * 焦点模型是 ARIA 的 select-only combobox：焦点始终留在触发元素上，列表用
 * aria-activedescendant 指向高亮项，因此这里不需要焦点陷阱也不锁滚动。
 *
 * 布尔属性用运行时声明并显式 default: undefined：类型写法会把 `open?: boolean`
 * 推断成 Boolean prop，未传入时得到 false，而受控判定依赖 undefined，
 * 结果是「不写 v-model:open 的下拉永远打不开」。flip / shift 同理，
 * 缺省要交给无头层决定而不是在这里钉成 false。
 */
const props = defineProps({
  options: { type: Array as PropType<SelectOptionSeed[]>, default: undefined },
  modelValue: { type: String, default: undefined },
  defaultValue: { type: String, default: '' },
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  form: { type: String, default: undefined },
  loop: { type: Boolean, default: true },
  typeaheadTimeout: { type: Number, default: undefined },
  ariaLabelledby: { type: String, default: undefined },
  ariaDescribedby: { type: String, default: undefined },
  placement: { type: String as PropType<FloatingPlacement>, default: undefined },
  offset: { type: [Number, Object] as PropType<number | FloatingOffset>, default: undefined },
  flip: { type: Boolean, default: undefined },
  shift: { type: Boolean, default: undefined },
  padding: { type: Number, default: undefined },
  strategy: { type: String as PropType<FloatingStrategy>, default: undefined },
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:open': [value: boolean];
}>();

const select = useSelect({
  ...props,
  options: toRef(() => props.options),
  modelValue: toRef(() => props.modelValue),
  open: toRef(() => props.open),
  disabled: toRef(() => props.disabled),
  required: toRef(() => props.required),
  name: toRef(() => props.name),
  form: toRef(() => props.form),
  typeaheadTimeout: toRef(() => props.typeaheadTimeout),
  ariaLabelledby: toRef(() => props.ariaLabelledby),
  ariaDescribedby: toRef(() => props.ariaDescribedby),
  onValueChange: (value) => emit('update:modelValue', value),
  onOpenChange: (value) => emit('update:open', value),
});

provide('select', select);

defineExpose({
  value: select.value,
  setValue: select.setValue,
  open: select.open,
  close: select.close,
  isOpen: select.isOpen,
} satisfies Partial<UseSelectReturn>);
</script>

<template>
  <slot />
</template>
