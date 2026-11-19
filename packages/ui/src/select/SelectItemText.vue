<script setup lang="ts">
import { onMounted, onUpdated, ref } from 'vue';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { SelectItemTextProps } from './types';

/**
 * Select 选项的文本部分。
 *
 * 它存在的唯一理由是把「可读文本」从选项的富内容里分离出来：typeahead 匹配与触发元素
 * 回显都只该用这段文本，而不是整个选项的 textContent（后者会把图标字符、徽标数字一起
 * 拼进去，搜「北」时可能命中一个角标）。
 *
 * 文本在挂载与每次更新后上报：插槽内容变化不会触发本组件的 props 变化，只有 updated
 * 钩子能捕捉到，因此不能用 watch(props) 代替。
 */
const props = withDefaults(defineProps<SelectItemTextProps>(), {
  as: 'span',
  asChild: false,
});

const item = useComponentContext('selectItem');

const element = ref<HTMLElement | null>(null);

function report(): void {
  item.setTextValue(element.value?.textContent?.trim() ?? '');
}

function setElement(node: unknown): void {
  element.value = node instanceof HTMLElement ? node : null;

  report();
}

onMounted(report);
onUpdated(report);
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" :el-ref="setElement" data-part="item-text">
    <slot />
  </Slot>
</template>
