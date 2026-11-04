<script setup lang="ts">
import { computed } from 'vue';

import { getCheckboxAttrs } from '@agile-plus/primitives/checkbox';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { CheckboxIndicatorProps } from './types';

/**
 * Checkbox 选中指示元素，语义对齐 Radix 的 Checkbox.Indicator。
 *
 * 默认只在选中或半选时挂载；需要进出两段动画时用 forceMount 让它常驻，
 * 由 data-state 驱动样式。它必须写在 CheckboxRoot 内部。
 */
const props = withDefaults(defineProps<CheckboxIndicatorProps>(), {
  as: 'span',
  forceMount: false,
  asChild: false,
});

const checkbox = useComponentContext('checkbox');

const shouldRender = computed(() => props.forceMount || checkbox.isIndicatorPresent.value);

/**
 * data-state 复用 primitives 的三态映射，避免在 UI 层再写第四份
 * 「布尔 / 半选 → 字符串」的对应关系。只取 data-state：本元素 aria-hidden，
 * 选中语义由外层触发元素的 aria-checked 独自表达，不能在这里重复一份。
 */
const indicatorProps = computed(() => ({
  'aria-hidden': 'true',
  'data-part': 'indicator',
  'data-state': getCheckboxAttrs({ checked: checkbox.checked.value })['data-state'],
}));
</script>

<template>
  <Slot v-if="shouldRender" :as="props.as" :as-child="props.asChild" v-bind="indicatorProps">
    <slot />
  </Slot>
</template>
