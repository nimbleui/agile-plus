<script setup lang="ts">
import { computed } from 'vue';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { PopoverTriggerProps } from './types';

/**
 * Popover 触发元素。点击切换开合；自家渲染 button 时补 type="button" 防表单误提交。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<PopoverTriggerProps>(), {
  as: 'button',
  asChild: false,
});

const popover = useComponentContext('popover');

const triggerProps = computed(() => popover.getTriggerProps());

const typeProp = computed(() => (props.asChild || props.as !== 'button' ? {} : { type: 'button' }));
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="popover.setTriggerElement"
    v-bind="{ ...typeProp, ...triggerProps, ...$attrs }"
    data-part="trigger"
    @click="popover.toggle"
  >
    <slot />
  </Slot>
</template>
