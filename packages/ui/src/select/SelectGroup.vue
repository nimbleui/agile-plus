<script setup lang="ts">
import { provide, useId } from 'vue';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { SelectGroupProps } from './types';

/**
 * Select 的选项分组。
 *
 * 渲染成 role="group"，并用 aria-labelledby 指向组内 SelectLabel 的 id——分组标题
 * 本身不是选项，读屏进入分组时先播报标题，再逐项播报，而不是把标题当成一个可选中的项。
 *
 * 标题 id 由本组件生成并通过上下文下发：Label 不必自己猜 id，组也不必知道 Label
 * 有没有被渲染（没渲染时 aria-labelledby 指向一个不存在的 id，读屏会忽略它）。
 */
const props = withDefaults(defineProps<SelectGroupProps>(), {
  as: 'div',
  asChild: false,
});

const select = useComponentContext('select');

const labelId = `select-label-${useId()}`;

provide('selectGroup', { labelId });
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="select.getGroupProps(labelId)"
    data-part="group"
  >
    <slot />
  </Slot>
</template>
