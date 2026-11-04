<script setup lang="ts">
import {
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastRoot,
  ToastTitle,
} from '@agile-plus/ui/toast';

import type { PropType } from 'vue';

import type { ToastRootEmits } from '@agile-plus/ui';

/**
 * 带样式的通知卡片。
 *
 * 必须用在 ToastProvider 内，并且需要页面上存在 ToastViewport：通知本体被 portal
 * 进视口列表，没有视口时这里什么都不渲染（与 Radix 同）。
 *
 * `variant` 是样式层独有的视觉意图，无头层没有对应概念——Radix 的 `type` 表达的是
 * 朗读敏感度（foreground / background），两者不能混用同一个 prop。
 */
const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: true },
  duration: { type: Number, default: undefined },
  type: { type: String as PropType<'foreground' | 'background'>, default: 'foreground' },
  forceMount: { type: Boolean, default: false },
  as: { type: String, default: 'li' },
  asChild: { type: Boolean, default: false },
  variant: {
    type: String as PropType<'default' | 'success' | 'warning' | 'danger' | 'info'>,
    default: 'default',
  },
  /** Action 的替代朗读文案，使用了 action 插槽就必须提供 */
  actionAltText: { type: String, default: '' },
});

const emit = defineEmits<ToastRootEmits>();

defineSlots<{
  default(): unknown;
  title(): unknown;
  description(): unknown;
  action(): unknown;
  close(): unknown;
}>();
</script>

<template>
  <ToastRoot
    :open="props.open"
    :default-open="props.defaultOpen"
    :duration="props.duration"
    :type="props.type"
    :force-mount="props.forceMount"
    :as="props.as"
    :as-child="props.asChild"
    class="y-toast"
    :class="props.variant !== 'default' ? `y-toast--${props.variant}` : undefined"
    @update:open="(value) => emit('update:open', value)"
  >
    <ToastTitle v-if="$slots.title" class="y-toast__title">
      <slot name="title" />
    </ToastTitle>

    <ToastDescription v-if="$slots.description" class="y-toast__description">
      <slot name="description" />
    </ToastDescription>

    <slot />

    <div v-if="$slots.action" class="y-toast__actions">
      <ToastAction class="y-toast__action" :alt-text="props.actionAltText">
        <slot name="action" />
      </ToastAction>
    </div>

    <ToastClose class="y-toast__close" aria-label="关闭">
      <slot name="close">
        <span aria-hidden="true">&times;</span>
      </slot>
    </ToastClose>
  </ToastRoot>
</template>

<style lang="scss">
@use './Toast.scss';
</style>
