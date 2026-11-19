<script setup lang="ts">
import { computed } from 'vue';

import { CheckboxRoot } from '../checkbox';
import { useComponentContext } from '../context';

import type { CheckboxCheckedState } from '@agile-plus/primitives/checkbox';

import type { TableSelectionCellProps } from './types';

/**
 * 行选择格。
 *
 * 勾选态与禁用态都从行键派生：禁用行（isRowSelectable 返回 false）的框置灰，
 * 点击被 headless 吞掉。可访问名缺省「选择此行」，需要朗读行标识时由消费者覆盖 label。
 */
const props = withDefaults(defineProps<TableSelectionCellProps>(), { label: '选择此行' });

const table = useComponentContext('table');

const checked = computed(() => table.isRowSelected(props.item.key));

const disabled = computed(() => !table.isRowSelectable(props.item.key));

function onChange(next: CheckboxCheckedState): void {
  table.toggleRowSelection(props.item.key, next === true);
}
</script>

<template>
  <td data-part="cell" data-selection="row">
    <CheckboxRoot
      :checked="checked"
      :disabled="disabled"
      :aria-label="label"
      @update:checked="onChange"
    />
  </td>
</template>