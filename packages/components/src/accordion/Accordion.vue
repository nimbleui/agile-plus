<script setup lang="ts">
import { AccordionRoot } from '@agile-plus/ui/accordion';

import type { PropType } from 'vue';

import type { AccordionRootEmits } from '@agile-plus/ui';

/**
 * 带样式的手风琴根容器。
 *
 * 视觉参数与无头层一一对应：type 决定值形状，collapsible 决定 single 能否全部收起。
 * 项的拼接、分隔线与箭头旋转都在样式层用 data-state 表达，不需要 JS 参与状态切换。
 */
const props = defineProps({
  type: { type: String as PropType<'single' | 'multiple'>, required: true },
  value: { type: [String, Array] as PropType<string | string[]>, default: undefined },
  defaultValue: { type: [String, Array] as PropType<string | string[]>, default: undefined },
  collapsible: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits<AccordionRootEmits>();
</script>

<template>
  <AccordionRoot
    v-bind="props"
    class="y-accordion"
    @update:value="(value) => emit('update:value', value)"
  >
    <slot />
  </AccordionRoot>
</template>

<style lang="scss">
@use './Accordion.scss';
</style>