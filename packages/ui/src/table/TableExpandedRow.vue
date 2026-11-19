<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import type { TableExpandedRowProps } from './types';

/**
 * 展开内容行。
 *
 * 紧随所属数据行渲染，一个横跨所有列的单元格承载插槽内容。td 的 id 与
 * 展开触发按钮的 aria-controls 同源（都来自 headless 的 getExpandedRowId），
 * 披露模式的指向关系因此不会失配。
 */
const props = defineProps<TableExpandedRowProps>();

const table = useComponentContext('table');

const span = computed(() => props.colspan ?? table.colSpan.value);

const cellId = computed(() => table.getExpandedRowId(props.item.key));
</script>

<template>
  <tr data-part="expanded-row">
    <td :id="cellId" data-part="expanded-cell" :colspan="span">
      <slot />
    </td>
  </tr>
</template>