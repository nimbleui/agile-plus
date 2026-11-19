<script setup lang="ts">
import { computed, provide, toRef } from 'vue';

import { useAccordion } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { AccordionRootEmits, AccordionRootProps } from './types';

/**
 * 手风琴根组件。
 *
 * 不渲染额外结构，只创建 useAccordion 实例并下发给 Item。值形状由 type 决定，
 * single 允许通过 collapsible 控制「能否全部收起」。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<AccordionRootProps>(), {
  value: undefined,
  defaultValue: undefined,
  collapsible: false,
  disabled: false,
  as: 'div',
  asChild: false,
});

const emit = defineEmits<AccordionRootEmits>();

const accordion = useAccordion({
  type: toRef(() => props.type),
  value: toRef(() => props.value),
  defaultValue: props.defaultValue,
  collapsible: toRef(() => props.collapsible),
  disabled: toRef(() => props.disabled),
  onValueChange: (value) => emit('update:value', value),
});

provide('accordion', accordion);

const rootAttrs = computed(() => accordion.getRootAttrs());
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...rootAttrs, ...$attrs }"
    data-part="root"
  >
    <slot />
  </Slot>
</template>