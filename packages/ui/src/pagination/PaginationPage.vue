<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import type { PaginationPageProps } from './types';

/**
 * 单个页码按钮。
 *
 * `aria-current="page"` 与 `data-state` 都来自 primitives 的属性表：当前页靠它表达，
 * 而不是再加一个 `is-active` class，样式层与自动化测试读的是同一份状态。
 * 按钮不给 aria-label——可见文本就是页码本身，额外标签反而会朗读成「第 3 页 3」。
 */
const props = defineProps<PaginationPageProps>();

const pagination = useComponentContext('pagination');

const pageProps = computed(() => pagination.getPageProps(props.page));
</script>

<template>
  <li data-part="item">
    <button
      type="button"
      data-part="page"
      v-bind="pageProps"
      @click="pagination.setValue(props.page)"
    >
      <slot>{{ props.page }}</slot>
    </button>
  </li>
</template>
