<script setup lang="ts">
import { ToastViewport as UiToastViewport } from '@agile-plus/ui/toast';

import type { ToastViewportProps } from '@agile-plus/ui';

/**
 * 带定位的通知视口。
 *
 * 无头层的视口不预设任何位置（Radix 把定位完全交给作者），样式层用 `position`
 * 提供六个常用方位。不开放插槽：通知是被 portal 进来的，写成子节点反而会让人
 * 误以为顺序由 DOM 位置决定。
 */
interface ToastViewportStyledProps extends ToastViewportProps {
  /**
   * 通知堆叠的方位。
   *
   * @default 'top-right'
   */
  position?:
    'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
}

const props = withDefaults(defineProps<ToastViewportStyledProps>(), {
  hotkey: () => ['F8'],
  label: 'Notifications ({hotkey})',
  position: 'top-right',
});
</script>

<template>
  <UiToastViewport
    :hotkey="props.hotkey"
    :label="props.label"
    class="y-toast-viewport"
    :class="`y-toast-viewport--${props.position}`"
  />
</template>

<style lang="scss">
@use './Toast.scss';
</style>
