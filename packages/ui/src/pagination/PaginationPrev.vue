<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import type { PaginationStepProps } from './types';

/**
 * 翻到上一页。
 *
 * 已经在第 1 页时由 primitives 标成 disabled，而不是绕回最后一页：分页是位置导航，
 * 不是轮播，「上一页」跳到末页会让人以为数据变了。
 * `aria-label` 保留，是因为样式层会把文字换成箭头图形，届时可访问名只能来自这里。
 */
const props = withDefaults(defineProps<PaginationStepProps>(), {
  label: '上一页',
});

const pagination = useComponentContext('pagination');

const stepProps = computed(() => pagination.getStepProps('previous'));
</script>

<template>
  <li data-part="item">
    <button
      type="button"
      data-part="previous"
      v-bind="stepProps"
      :aria-label="props.label"
      @click="pagination.step('previous')"
    >
      <slot>{{ props.label }}</slot>
    </button>
  </li>
</template>
