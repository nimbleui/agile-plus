<script setup lang="ts">
import { inject } from 'vue';

import type { UseDialogReturn } from '@agile-plus/headless';

/**
 * Dialog 标题组件。
 *
 * 渲染为 h2 元素，自动绑定 id 以与内容区域的 aria-labelledby 关联。
 * 消费者可通过默认插槽自定义标题内容。
 */
const dialog = inject<UseDialogReturn>('dialog');

if (!dialog) {
  throw new Error('DialogTitle must be used within DialogRoot');
}

const titleProps = dialog.getTitleProps();
</script>

<template>
  <h2 v-bind="titleProps" data-part="title">
    <slot />
  </h2>
</template>
