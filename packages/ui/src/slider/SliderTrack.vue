<script setup lang="ts">
import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { SliderTrackProps } from './types';

/**
 * Slider 轨道。
 *
 * 只负责把朝向与禁用状态暴露给样式层；点击与拖拽统一由 Root 处理，
 * 因此 Track 不注册任何指针事件，消费者也可以把它替换成任意元素。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SliderTrackProps>(), {
  as: 'span',
  asChild: false,
});

const slider = useComponentContext('slider');
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="{ ...slider.getTrackProps(), ...$attrs }">
    <slot />
  </Slot>
</template>
