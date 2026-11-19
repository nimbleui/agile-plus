<script setup lang="ts">
import { computed } from 'vue';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { DropdownMenuTriggerProps } from './types';

/** DropdownMenu 触发元素：点击切换，方向键 / Enter 打开并落高亮。 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<DropdownMenuTriggerProps>(), {
  as: 'button',
  asChild: false,
});

const menu = useComponentContext('dropdownMenu');

const triggerProps = computed(() => menu.getTriggerProps());

const typeProp = computed(() => (props.asChild || props.as !== 'button' ? {} : { type: 'button' }));
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="menu.setTriggerElement"
    v-bind="{ ...typeProp, ...triggerProps, ...$attrs }"
    data-part="trigger"
    @click="menu.toggle"
    @keydown="menu.onTriggerKeydown"
  >
    <slot />
  </Slot>
</template>
