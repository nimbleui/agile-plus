<script setup lang="ts">
import { computed } from 'vue';

import {
  PaginationEllipsis,
  PaginationJumper,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrev,
  PaginationRoot,
} from '@agile-plus/ui/pagination';

import type { PaginationProps } from './types';

/**
 * 带样式的分页。
 *
 * 页码窗口由 ui 层的 Root 算好后经默认插槽作用域交回，这里替消费者完成 v-for；
 * 复合部件本身仍全部保留在 `@agile-plus/ui/pagination`，需要自定义布局（比如把
 * 翻页按钮换成图标按钮组）时绕过本组件自行装配即可。
 *
 * 翻页按钮与跳转框都落在 `PaginationList` 的 `ul` 里：部件本身渲染成 `li`，
 * 而 `li` 的直接父级必须是列表元素，挂在 `nav` 下是无效标记，也会让它们逃过
 * 宿主文档 `li + li` 一类的规则、和页码不在一条基线上。
 *
 * size 与 showJumper 是本层的视觉属性，透传给 Root 会变成 nav 上的无效 attr，先剔除。
 * 翻页按钮的可见文字换成箭头图形，可访问名仍由部件的默认 aria-label 提供。
 */
const props = withDefaults(defineProps<PaginationProps>(), {
  modelValue: undefined,
  defaultValue: undefined,
  total: undefined,
  pageSize: undefined,
  pageCount: undefined,
  siblingCount: undefined,
  boundaryCount: undefined,
  disabled: false,
  ariaLabel: undefined,
  size: 'middle',
  showJumper: false,
});

const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const rootProps = computed(() => {
  const { size: _size, showJumper: _showJumper, ...rest } = props;

  return rest;
});
</script>

<template>
  <PaginationRoot
    v-bind="rootProps"
    :class="['y-pagination', `y-pagination--${props.size}`]"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <template #default="{ items }">
      <PaginationList>
        <PaginationPrev>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M6.5 2.5 3 6l3.5 3.5M10 2.5 6.5 6l3.5 3.5"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </PaginationPrev>

        <template v-for="item in items" :key="item.key">
          <PaginationPage v-if="item.type === 'page'" :page="item.page" />
          <PaginationEllipsis v-else :side="item.side" />
        </template>

        <PaginationNext>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M5.5 2.5 9 6l-3.5 3.5M2 2.5 5.5 6 2 9.5"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </PaginationNext>

        <PaginationJumper v-if="props.showJumper" />
      </PaginationList>
    </template>
  </PaginationRoot>
</template>

<style lang="scss">
@use './Pagination.scss';
</style>
