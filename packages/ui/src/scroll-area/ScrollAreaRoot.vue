<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useScrollArea } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { ScrollAreaRootProps } from './types';

/**
 * ScrollArea 根组件，作为五个部件的上下文提供者。
 *
 * 只负责持有配置与状态，不产生任何布局：溢出与滚动由 Viewport 承担。
 */
const props = withDefaults(defineProps<ScrollAreaRootProps>(), {
  type: 'hover',
  scrollHideDelay: 600,
  as: 'div',
  asChild: false,
});

// Slot 自身不继承 attrs，消费者传入的 class / style 必须显式并入。
defineOptions({ inheritAttrs: false });

const area = useScrollArea({
  type: toRef(() => props.type),
  scrollHideDelay: props.scrollHideDelay,
  dir: toRef(() => props.dir),
  minThumbSize: props.minThumbSize,
});

provide('scrollArea', area);

const rootProps = area.getRootProps();
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="{ ...rootProps, ...$attrs }">
    <slot />
  </Slot>
</template>
