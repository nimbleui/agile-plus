<script setup lang="ts">
import { TOAST_ANNOUNCE_EXCLUDE_ATTR } from '@agile-plus/primitives/toast';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { ToastCloseProps } from './types';

// Slot 自身不继承 attrs，消费者传入的 class / style 必须显式并入。
defineOptions({ inheritAttrs: false });

/**
 * 关闭按钮。
 *
 * 带 announce-exclude 标记：按钮的可见文案（「关闭」）不该被读第二遍，朗读文本
 * 由 announcer 收集时跳过本元素。
 */
const props = withDefaults(defineProps<ToastCloseProps>(), {
  as: 'button',
  asChild: false,
});

const toast = useComponentContext('toast');

const closeProps = {
  type: 'button',
  [TOAST_ANNOUNCE_EXCLUDE_ATTR]: '',
};
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...closeProps, ...$attrs }"
    data-part="close"
    @click="toast.close"
  >
    <slot />
  </Slot>
</template>
