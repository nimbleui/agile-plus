<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import type { PaginationStepProps } from './types';

/**
 * 翻到下一页。
 *
 * 与 PaginationPrev 是两个文件而不是一个 `direction` prop：物料面板按组件名登记部件，
 * 画布上「拖一个下一页」必须有一个独立名字可对号，合并反而会丢掉这一层可寻址性。
 */
const props = withDefaults(defineProps<PaginationStepProps>(), {
  label: '下一页',
});

const pagination = useComponentContext('pagination');

const stepProps = computed(() => pagination.getStepProps('next'));
</script>

<template>
  <li data-part="item">
    <button
      type="button"
      data-part="next"
      v-bind="stepProps"
      :aria-label="props.label"
      @click="pagination.step('next')"
    >
      <slot>{{ props.label }}</slot>
    </button>
  </li>
</template>
