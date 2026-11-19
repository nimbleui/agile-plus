<script setup lang="ts">
import { provide, toRef } from 'vue';

import { usePopover } from '@agile-plus/headless';

import type { PropType } from 'vue';

import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy, UsePopoverReturn } from '@agile-plus/headless';

import type { PopoverRootEmits } from './types';

/**
 * Popover 根组件：只持有开合状态与定位并下发上下文，不渲染元素。
 *
 * 布尔受控属性用运行时声明并显式 default: undefined：被 cast 成 false 会让非受控
 * 用法永远打不开；flip / shift 缺省交给无头层决定。
 */
const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  onOpenChange: { type: Function as PropType<(open: boolean) => void>, default: undefined },
  placement: { type: String as PropType<FloatingPlacement>, default: undefined },
  offset: { type: [Number, Object] as PropType<number | FloatingOffset>, default: undefined },
  flip: { type: Boolean, default: undefined },
  shift: { type: Boolean, default: undefined },
  padding: { type: Number, default: undefined },
  strategy: { type: String as PropType<FloatingStrategy>, default: undefined },
});

const emit = defineEmits<PopoverRootEmits>();

const popover = usePopover({
  ...props,
  open: toRef(() => props.open),
  onOpenChange: (value) => {
    props.onOpenChange?.(value);
    emit('update:open', value);
  },
});

provide('popover', popover);

defineExpose({
  open: popover.open,
  close: popover.close,
  isOpen: popover.isOpen,
} satisfies Partial<UsePopoverReturn>);
</script>

<template>
  <slot />
</template>
