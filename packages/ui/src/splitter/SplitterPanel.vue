<script setup lang="ts">
import { computed, toRef, useId } from 'vue';

import { useSplitterPanel } from '@agile-plus/headless';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import SplitterBar from './SplitterBar.vue';

import type { SplitterPanelEmits, SplitterPanelProps } from './types';

/**
 * 分隔面板的一个面板。
 *
 * 面板在 setup 阶段就登记进根的集合，顺序即 DOM 顺序；它自己不算尺寸，只持有作者单位
 * 与约束，解析成像素由根统一完成——一次拖拽同时改变相邻两个面板，真源必须唯一。
 *
 * 模板是片段：面板本体 + 它与下一个面板之间的分隔条。分隔条挂在这里而不是根上，
 * 才能让根保持「只渲染默认插槽」的形状，作者也不必手写 `面板 分隔条 面板` 的骨架。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SplitterPanelProps>(), {
  size: undefined,
  defaultSize: undefined,
  min: undefined,
  max: undefined,
  collapsible: undefined,
  resizable: true,
  disabled: false,
  as: 'div',
});

const emit = defineEmits<SplitterPanelEmits>();

const splitter = useComponentContext('splitter');

const id = useId();

const panel = useSplitterPanel(
  {
    id,
    size: toRef(() => props.size),
    defaultSize: toRef(() => props.defaultSize),
    min: toRef(() => props.min),
    max: toRef(() => props.max),
    resizable: toRef(() => props.resizable),
    disabled: toRef(() => props.disabled),
    collapsible: toRef(() => props.collapsible),
    onSizeChange: (size) => emit('update:size', size),
  },
  splitter
);

const panelAttrs = computed(() => panel.getPanelProps());

const panelStyle = computed(() => panel.getPanelStyle());

const panelSize = computed(() => panel.getPanelSize());

const collapsed = panel.collapsed;

const index = panel.index;

const hasNext = panel.hasNext;
</script>

<template>
  <Slot :as="props.as" v-bind="{ ...panelAttrs, ...$attrs }" :style="panelStyle">
    <slot :collapsed="collapsed" :index="index" :size="panelSize" />
  </Slot>
  <SplitterBar v-if="hasNext" :bar-id="id" />
</template>
