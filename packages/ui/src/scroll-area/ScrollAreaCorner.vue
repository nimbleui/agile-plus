<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { ScrollAreaCornerProps } from './types';

// Slot 自身不继承 attrs，消费者传入的 class 必须显式并入。
defineOptions({ inheritAttrs: false });

/**
 * 横竖滚动条相交处的小方块。
 *
 * 只在两个方向的滚动条同时可见时渲染，否则会露出一块没有归属的底色。
 */
const props = withDefaults(defineProps<ScrollAreaCornerProps>(), {
  as: 'div',
  asChild: false,
});

const area = useComponentContext('scrollArea');

const visible = computed(() => area.isCornerVisible.value);
</script>

<template>
  <Slot
    v-if="visible"
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...area.getCornerProps(), ...$attrs }"
  >
    <slot />
  </Slot>
</template>
