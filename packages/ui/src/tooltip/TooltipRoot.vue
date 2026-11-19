<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useTooltip } from '@agile-plus/headless';

import type { PropType } from 'vue';

import type {
  FloatingArrowOptions,
  FloatingOffset,
  FloatingPlacement,
} from '@agile-plus/primitives/floating';

import type { FloatingStrategy, UseTooltipReturn } from '@agile-plus/headless';

/**
 * Tooltip 根组件：只持有状态并下发上下文，不渲染任何元素。
 *
 * 与 Dialog 不同，Tooltip 不管理焦点陷阱也不锁滚动——它是非模态的补充信息，
 * 焦点始终留在触发元素上，读屏通过 aria-describedby 读到内容。
 *
 * 布尔属性用运行时声明并显式 default: undefined：类型写法会把 `open?: boolean`
 * 推断成 Boolean prop，未传入时得到 false，受控判定依赖 undefined，
 * 结果是「不写 v-model:open 的提示永远打不开」。flip / shift 同理，
 * 缺省要交给无头层决定而不是在这里钉成 false。
 */
const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  onOpenChange: { type: Function as PropType<(open: boolean) => void>, default: undefined },
  delayDuration: { type: Number, default: undefined },
  skipDelayDuration: { type: Number, default: undefined },
  disableHoverableContent: { type: Boolean, default: false },
  placement: { type: String as PropType<FloatingPlacement>, default: undefined },
  offset: { type: [Number, Object] as PropType<number | FloatingOffset>, default: undefined },
  flip: { type: Boolean, default: undefined },
  shift: { type: Boolean, default: undefined },
  padding: { type: Number, default: undefined },
  strategy: { type: String as PropType<FloatingStrategy>, default: undefined },
  arrow: { type: Object as PropType<FloatingArrowOptions>, default: undefined },
});

const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const tooltip = useTooltip({
  ...props,
  open: toRef(() => props.open),
  onOpenChange: (value) => {
    props.onOpenChange?.(value);
    emit('update:open', value);
  },
});

provide('tooltip', tooltip);

defineExpose({
  open: tooltip.open,
  close: tooltip.close,
  isOpen: tooltip.isOpen,
} satisfies Partial<UseTooltipReturn>);
</script>

<template>
  <slot />
</template>
