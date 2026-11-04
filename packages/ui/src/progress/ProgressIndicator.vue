<script setup lang="ts">
import { computed } from 'vue';

import { getProgressIndicatorAttrs } from '@agile-plus/primitives/progress';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { ProgressIndicatorProps } from './types';

/**
 * 进度指示条。
 *
 * 只输出 Root 同一份判定的 data-state / data-value / data-max，**不带 role 与
 * aria-***：同一段进度已经由根元素的 progressbar 播报一次，重复输出会被读屏读两遍。
 * 宽度不写在行内样式上——它由样式层用继承来的 `--y-progress-value` 换算，
 * 所以换主题或改成 transform 位移都不需要动这一层。
 */
const props = withDefaults(defineProps<ProgressIndicatorProps>(), {
  as: 'div',
  asChild: false,
});

const progress = useComponentContext('progress');

const indicatorAttrs = computed(() => getProgressIndicatorAttrs(progress.config.value));
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="indicatorAttrs" data-part="indicator">
    <slot />
  </Slot>
</template>
