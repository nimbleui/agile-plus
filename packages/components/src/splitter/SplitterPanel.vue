<script setup lang="ts">
import { computed } from 'vue';

import { SplitterPanel } from '@agile-plus/ui/splitter';

import type { SplitterPanelEmits } from '@agile-plus/ui/splitter';

import type { SplitterPanelProps } from './types';

/**
 * 带样式的分隔面板。
 *
 * 尺寸、约束与折叠能力都写在自己身上，分隔条由它自动画在自己与下一个面板之间，
 * 因此最后一个面板后面不会多出一条空 bar。作用域插槽转出 `collapsed` / `index` / `size`，
 * 供面板头部显示折叠状态或当前像素宽度。
 *
 * 折叠时内边距归零并裁掉溢出，否则 border-box 下的 `flex-basis: 0` 会被内边距顶开，
 * 「收起」就收不到 0。
 */
const props = withDefaults(defineProps<SplitterPanelProps>(), {
  size: undefined,
  defaultSize: undefined,
  min: undefined,
  max: undefined,
  resizable: true,
  disabled: false,
  collapsible: undefined,
  as: 'div',
});

const emit = defineEmits<SplitterPanelEmits>();

const panelProps = computed(() => ({
  size: props.size,
  defaultSize: props.defaultSize,
  min: props.min,
  max: props.max,
  resizable: props.resizable,
  disabled: props.disabled,
  collapsible: props.collapsible,
  as: props.as,
}));
</script>

<template>
  <SplitterPanel
    v-bind="panelProps"
    class="y-splitter__panel"
    @update:size="(size) => emit('update:size', size)"
  >
    <template #default="scope">
      <slot v-bind="scope" />
    </template>
  </SplitterPanel>
</template>

<style lang="scss">
@use './Splitter.scss';
</style>
