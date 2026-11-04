<script setup lang="ts">
import { computed } from 'vue';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { CollapsibleTriggerProps } from './types';

/**
 * 折叠区触发按钮。
 *
 * 点击切换由 Composable 的 toggle 承担（禁用时不响应）；`aria-controls` 与
 * `aria-expanded` 由属性表给出，这里不再重复声明。
 */
const props = withDefaults(defineProps<CollapsibleTriggerProps>(), {
  as: 'button',
  asChild: false,
});

const collapsible = useComponentContext('collapsible');

const triggerAttrs = computed(() => ({
  ...collapsible.getTriggerAttrs(),
  disabled: collapsible.isDisabled.value || undefined,
}));
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="triggerAttrs"
    data-part="trigger"
    @click="collapsible.toggle"
  >
    <slot :open="collapsible.isOpen" :disabled="collapsible.isDisabled" />
  </Slot>
</template>
