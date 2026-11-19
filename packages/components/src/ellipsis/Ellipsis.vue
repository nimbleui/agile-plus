<script setup lang="ts">
import { Ellipsis as EllipsisPrimitive } from '@agile-plus/ui/ellipsis';

import type { EllipsisProps } from './types';

/**
 * 带样式的文本省略组件。
 *
 * 外壳 span 提供尺寸与排版上下文；截断 / flex / 不可选中这些**行为**样式由无头层
 * 内联产出，本层只加装饰（字号、尾部次要色、展开按钮的链接外观与焦点环）。
 *
 * 展开按钮是 ui 层渲染的、与截断元素平级的节点，因此本层外壳把它们一起包住，
 * 样式才能用后代选择器选中按钮而不必给 ui 层塞 class。
 */
const props = withDefaults(defineProps<EllipsisProps>(), {
  mode: 'single',
  lines: undefined,
  tailChars: undefined,
  expandable: false,
  expandText: '展开',
  collapseText: '收起',
  tooltip: true,
  expanded: undefined,
  defaultExpanded: false,
  size: 'middle',
});

const emit = defineEmits<{ 'update:expanded': [value: boolean] }>();
</script>

<template>
  <span :class="['y-ellipsis', `y-ellipsis--${props.size}`]">
    <EllipsisPrimitive
      v-bind="props"
      @update:expanded="(value) => emit('update:expanded', value)"
    >
      <slot />
    </EllipsisPrimitive>
  </span>
</template>

<style lang="scss">
@use './Ellipsis.scss';
</style>
