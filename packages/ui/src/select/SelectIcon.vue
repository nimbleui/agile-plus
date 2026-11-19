<script setup lang="ts">
import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { SelectIconProps } from './types';

/**
 * Select 的装饰性图标（通常是下拉箭头）。
 *
 * 纯装饰，对读屏隐藏：开合状态由触发元素的 aria-expanded 表达，在这里重复一份
 * 只会让读屏播两遍。朝向交给样式层读父级 data-state 决定，逻辑层不产出旋转角度。
 */
const props = withDefaults(defineProps<SelectIconProps>(), {
  as: 'span',
  asChild: false,
});

const select = useComponentContext('select');
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="select.getIconProps()">
    <slot />
  </Slot>
</template>
