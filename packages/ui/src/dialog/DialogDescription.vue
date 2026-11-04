<script setup lang="ts">
import { inject } from 'vue';

import type { UseDialogReturn } from '@agile-plus/headless';

/**
 * Dialog 描述组件。
 *
 * 渲染为 p 元素，自动绑定 id 以与内容区域的 aria-describedby 关联。
 * 消费者可通过默认插槽自定义描述内容。
 */
const dialog = inject<UseDialogReturn>('dialog');

if (!dialog) {
  throw new Error('DialogDescription must be used within DialogRoot');
}

const descriptionProps = dialog.getDescriptionProps();
</script>

<template>
  <p v-bind="descriptionProps" data-part="description">
    <slot />
  </p>
</template>
