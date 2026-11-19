<script setup lang="ts">
import { useComponentContext } from '../context';

import { Slot } from '../slot';

import type { SelectItemIndicatorProps } from './types';

/**
 * Select 选项的选中标记。
 *
 * 默认只在选中时挂载；需要进出两段动画时用 forceMount 让它常驻，由 data-state 驱动。
 * 纯装饰，对读屏隐藏：选中语义由外层选项的 aria-selected 独自表达，不能在这里重复一份。
 *
 * 必须写在 SelectItem 内部：它注入的是项级上下文，放错层级会抛错而不是静默失效。
 */
const props = withDefaults(defineProps<SelectItemIndicatorProps>(), {
  forceMount: false,
  as: 'span',
  asChild: false,
});

const item = useComponentContext('selectItem');
</script>

<template>
  <Slot
    v-if="props.forceMount || item.isSelected.value"
    :as="props.as"
    :as-child="props.asChild"
    :data-state="item.isSelected.value ? 'checked' : 'unchecked'"
    aria-hidden="true"
    data-part="item-indicator"
  >
    <slot />
  </Slot>
</template>
