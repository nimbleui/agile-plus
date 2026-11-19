<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import type { TableExpandTriggerProps } from './types';

/**
 * 展开触发按钮。
 *
 * APG 披露模式：aria-expanded 播报开合，aria-controls 指向展开内容行的 td，
 * 读屏可以直接跳过去。图标由插槽决定——复合层不画任何视觉，成品层放一个箭头。
 */
const props = defineProps<TableExpandTriggerProps>();

const table = useComponentContext('table');

const triggerProps = computed(() => table.getExpandTriggerProps(props.item.key));

function onToggle(): void {
  table.toggleRowExpanded(props.item.key);
}
</script>

<template>
  <button data-part="expand-trigger" v-bind="triggerProps" @click="onToggle">
    <slot />
  </button>
</template>