<script setup lang="ts">
import { computed } from 'vue';

import { SplitterRoot } from '@agile-plus/ui/splitter';

import type { SplitterRootEmits } from '@agile-plus/ui/splitter';

import type { SplitterProps } from './types';

/**
 * 带样式的分隔面板。
 *
 * 与子组件 `SplitterPanel` 配套使用：根只声明排列方向与整组开关，面板写在自己的标签上
 * （`size` / `min` / `max` / `collapsible`），分隔条由面板自动画在两者之间。
 *
 * 外观由根上的 `data-layout` 与 `dir` 驱动，分隔条与箭头跟着 `data-*` 状态变化，
 * 因此不提供 size / variant。尺寸变量以 `--y-splitter-` 为前缀，可逐实例覆写。
 *
 * 容器必须在排列方向上有确定尺寸：横向分割要有宽度，纵向分割要有高度。尺寸靠
 * ResizeObserver 实测，父级高度为 auto 时纵向面板会算不出可用空间。
 *
 * 需要自定义部件结构或直接绑定 headless 状态时，改用 UI 层的 SplitterRoot /
 * SplitterPanel / SplitterBar；本封装固定「面板自动带出分隔条」这一种结构。
 */
const props = withDefaults(defineProps<SplitterProps>(), {
  layout: 'horizontal',
  dir: 'ltr',
  barSize: 8,
  resizeStep: 10,
  lazy: false,
  disabled: false,
  as: 'div',
});

const emit = defineEmits<SplitterRootEmits>();

const rootProps = computed(() => ({
  layout: props.layout,
  dir: props.dir,
  barSize: props.barSize,
  resizeStep: props.resizeStep,
  lazy: props.lazy,
  disabled: props.disabled,
  as: props.as,
}));
</script>

<template>
  <SplitterRoot
    v-bind="rootProps"
    class="y-splitter"
    @resize-start="(sizes) => emit('resize-start', sizes)"
    @resize="(sizes) => emit('resize', sizes)"
    @resize-end="(sizes) => emit('resize-end', sizes)"
    @collapse="(collapsed, sizes) => emit('collapse', collapsed, sizes)"
    @dragger-double-click="(index) => emit('dragger-double-click', index)"
  >
    <slot />
  </SplitterRoot>
</template>

<style lang="scss">
@use './Splitter.scss';
</style>
