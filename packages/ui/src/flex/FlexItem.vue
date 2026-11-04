<script setup lang="ts">
import { computed } from 'vue';

import { getFlexItemAttrs, getFlexItemStyles } from '@agile-plus/primitives';

import { Slot } from '../slot';

import type { FlexItemProps } from './types';

/**
 * Flex 单项组件。
 *
 * alignSelf 属于有限枚举，因此同样输出 data-* 钩子交给样式层；flex / grow / shrink /
 * basis / order 是任意 CSS 值，只能写成元素自身的内联声明。两者都只在消费者显式传入
 * 时才产出，未传的属性保持 CSS 初始值。
 *
 * 与 FlexRoot 一样是无状态组件：不注入上下文，也不要求必须是 FlexRoot 的直接子节点，
 * 嵌套容器（如 Flex 里再放一个 Flex）中的单项行为同样正确。
 */
const props = withDefaults(defineProps<FlexItemProps>(), {
  as: 'div',
  asChild: false,
});

const itemAttrs = computed(() => getFlexItemAttrs(props));

const itemStyles = computed(() => getFlexItemStyles(props));
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="itemAttrs" :style="itemStyles">
    <slot />
  </Slot>
</template>
