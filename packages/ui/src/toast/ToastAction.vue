<script setup lang="ts">
import { computed } from 'vue';

import { TOAST_ANNOUNCE_ALT_ATTR, TOAST_ANNOUNCE_EXCLUDE_ATTR } from '@agile-plus/primitives/toast';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { ToastActionProps } from './types';

// Slot 自身不继承 attrs，消费者传入的 class / style 必须显式并入。
defineOptions({ inheritAttrs: false });

/**
 * 带替代文案的操作按钮，语义上等价于一个会关闭通知的按钮。
 *
 * 存在的理由是可访问性：操作按钮往往只有一个词（「撤销」「升级」），读屏用户无法
 * 从按钮本身跳回它影响的对象。`altText` 提供完整句子，并被写进 announcer 的替代
 * 文本，让播报时读这句而不是那个词。
 */
const props = withDefaults(defineProps<ToastActionProps>(), {
  as: 'button',
  asChild: false,
});

const toast = useComponentContext('toast');

const isValid = computed(() => props.altText.trim().length > 0);

if (!isValid.value) {
  console.error('Invalid prop `altText` supplied to `ToastAction`. Expected non-empty `string`.');
}

const actionProps = computed(() => ({
  type: 'button',
  [TOAST_ANNOUNCE_EXCLUDE_ATTR]: '',
  [TOAST_ANNOUNCE_ALT_ATTR]: props.altText,
}));
</script>

<template>
  <Slot
    v-if="isValid"
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...actionProps, ...$attrs }"
    data-part="action"
    @click="toast.close"
  >
    <slot />
  </Slot>
</template>
