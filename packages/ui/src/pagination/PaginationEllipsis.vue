<script setup lang="ts">
import { useComponentContext } from '../context';

import type { PaginationEllipsisProps } from './types';

/**
 * 省略号。
 *
 * 它是 `span` 不是 `button`：折叠出来的空档不可点击，做成按钮会让人在 Tab 序列里
 * 按到一个什么都做不了的焦点位。`aria-hidden` 则是因为「1 … 10」里的省略信息
 * 已由页码间距本身表达，朗读出一个「点」只会打断序列。
 *
 * 这里仍然取用上下文，是为了让「省略号画在 Root 之外」在开发期就抛错——单独一个
 * 「…」没有任何可解释的语义。
 */
const props = withDefaults(defineProps<PaginationEllipsisProps>(), {
  side: 'start',
});

useComponentContext('pagination');
</script>

<template>
  <li data-part="item">
    <span data-part="ellipsis" :data-side="props.side" aria-hidden="true">
      <slot>&#8230;</slot>
    </span>
  </li>
</template>
