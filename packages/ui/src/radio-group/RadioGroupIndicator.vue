<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { RadioGroupIndicatorProps } from './types';

/**
 * RadioGroup 选中指示元素，语义对齐 Radix 的 RadioGroup.Indicator。
 *
 * 默认只在选中时挂载，未选中时 DOM 里不存在该节点；需要进出两段动画时开 forceMount
 * 让它常驻，由 data-state 驱动样式。选中状态取自 RadioGroupItem 提供的 item 级上下文，
 * 因此本组件必须写在 RadioGroupItem 内部。
 */
const props = withDefaults(defineProps<RadioGroupIndicatorProps>(), {
  as: 'span',
  forceMount: false,
  asChild: false,
});

const { isChecked } = useComponentContext('radioGroupItem');

const shouldRender = computed(() => props.forceMount || isChecked.value);

const indicatorProps = computed(() => ({
  'aria-hidden': 'true',
  'data-part': 'indicator',
  'data-state': isChecked.value ? 'checked' : 'unchecked',
}));
</script>

<template>
  <Slot v-if="shouldRender" :as="props.as" :as-child="props.asChild" v-bind="indicatorProps">
    <slot />
  </Slot>
</template>
