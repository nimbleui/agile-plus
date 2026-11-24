<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useSplitter } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { SplitterRootEmits, SplitterRootProps } from './types';

/**
 * 分隔面板根组件。
 *
 * 只负责创建 `useSplitter` 实例、测量容器并把它下发给面板；分隔条不在这里画，
 * 由每个面板在自己与下一个面板之间补一条，作者因此只写面板、不写布局骨架。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SplitterRootProps>(), {
  layout: 'horizontal',
  dir: 'ltr',
  barSize: 8,
  resizeStep: 10,
  lazy: false,
  disabled: false,
  as: 'div',
  asChild: false,
});

const emit = defineEmits<SplitterRootEmits>();

const splitter = useSplitter({
  layout: toRef(() => props.layout),
  dir: toRef(() => props.dir),
  barSize: toRef(() => props.barSize),
  resizeStep: toRef(() => props.resizeStep),
  lazy: toRef(() => props.lazy),
  disabled: toRef(() => props.disabled),
  onResizeStart: (sizes) => emit('resize-start', sizes),
  onResize: (sizes) => emit('resize', sizes),
  onResizeEnd: (sizes) => emit('resize-end', sizes),
  onCollapse: (collapsed, sizes) => emit('collapse', collapsed, sizes),
  onDraggerDoubleClick: (index) => emit('dragger-double-click', index),
});

provide('splitter', splitter);
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="splitter.setRootElement"
    v-bind="{ ...splitter.getRootProps(), ...$attrs }"
  >
    <slot />
  </Slot>
</template>
