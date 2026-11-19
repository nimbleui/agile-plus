<script setup lang="ts">
import { computed } from 'vue';

import { CheckboxRoot } from '../checkbox';
import { useComponentContext } from '../context';

import type { CheckboxCheckedState } from '@agile-plus/primitives/checkbox';

import type { TableSelectionHeadProps } from './types';

/**
 * 全选表头格。
 *
 * 复用 Checkbox 部件而不是自绘勾选框：三态、键盘、表单归属与隐藏 input 都由
 * Checkbox 体系负责。全选框的三态来自当前页可选行的选中比例，点击在
 * 「全选 / 取消」之间切换——半选被明确化为全选，与 Checkbox 的点击语义一致。
 * 没有任何可选行时禁用，避免点一个永远勾不上的框。
 */
withDefaults(defineProps<TableSelectionHeadProps>(), { label: '全选' });

const table = useComponentContext('table');

const checked = computed<CheckboxCheckedState>(() => {
  const state = table.selectionState.value;

  if (state === 'checked') return true;
  if (state === 'indeterminate') return 'indeterminate';

  return false;
});

const disabled = computed(() => table.selectableKeys.value.length === 0);

function onChange(next: CheckboxCheckedState): void {
  table.toggleAllSelection(next === true);
}
</script>

<template>
  <th data-part="head" data-selection="all" scope="col">
    <CheckboxRoot
      :checked="checked"
      :disabled="disabled"
      :aria-label="label"
      @update:checked="onChange"
    />
  </th>
</template>