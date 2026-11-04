<script setup lang="ts">
import { inject } from 'vue';

import type { UseDialogReturn } from '@agile-plus/headless';

/**
 * Dialog 关闭按钮组件。
 *
 * 渲染为按钮元素，点击时关闭对话框。
 * 消费者可通过默认插槽自定义关闭按钮内容（图标、文字等）。
 */
const dialog = inject<UseDialogReturn>('dialog');

if (!dialog) {
  throw new Error('DialogClose must be used within DialogRoot');
}
</script>

<template>
  <button type="button" aria-label="关闭" @click="dialog.close()">
    <slot />
  </button>
</template>
