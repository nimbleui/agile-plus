<script setup lang="ts">
import { computed, inject } from 'vue';

import type { UseDialogReturn } from '@agile-plus/headless';

/**
 * Dialog 触发器组件。
 *
 * 渲染为按钮元素，自动绑定 aria-haspopup、aria-expanded 等无障碍属性。
 * 点击时打开对话框。消费者可通过默认插槽自定义触发器内容。
 */
const dialog = inject<UseDialogReturn>('dialog');

if (!dialog) {
  throw new Error('DialogTrigger must be used within DialogRoot');
}

// aria-expanded 与 aria-controls 随开关状态变化，必须使用 computed 而非一次性快照。
const triggerProps = computed(() => dialog.getTriggerProps());
</script>

<template>
  <button type="button" v-bind="triggerProps" @click="dialog.open()">
    <slot />
  </button>
</template>
