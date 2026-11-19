<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { AccordionTriggerProps } from './types';

/**
 * 手风琴项的触发按钮。
 *
 * 点击切换复用 Collapsible 的 toggle（禁用时不响应）；aria-expanded / aria-controls
 * 由属性表给出。上下箭头 / Home / End 只在项之间移动焦点，不展开——展开交给
 * Enter / Space / click，原生 button 已处理。
 */
const props = withDefaults(defineProps<AccordionTriggerProps>(), {
  as: 'button',
  asChild: false,
});

const accordion = useComponentContext('accordion');

const item = useComponentContext('accordionItem');

const triggerAttrs = computed(() => ({
  ...item.collapsible.getTriggerAttrs(),
  disabled: item.disabled.value || undefined,
}));

function onKeydown(event: KeyboardEvent): void {
  accordion.onTriggerKeydown(event, item.itemValue.value);
}
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="item.setTriggerElement"
    v-bind="triggerAttrs"
    data-part="trigger"
    @click="item.collapsible.toggle"
    @keydown="onKeydown"
  >
    <slot :open="item.collapsible.isOpen" :disabled="item.disabled" />
  </Slot>
</template>