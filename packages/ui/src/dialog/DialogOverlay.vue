<script setup lang="ts">
import { inject } from 'vue';

import { usePresence } from '@agile-plus/headless';

import type { UseDialogReturn } from '@agile-plus/headless';

/**
 * Dialog 遮罩层组件。
 *
 * 渲染为全屏覆盖层，点击时根据 closeOnOverlayClick 配置决定是否关闭对话框。
 * 与内容区域传送到同一个目标，否则两层的 z-index 关系不再由组件保证。
 *
 * 挂载与否同样交给共享的 `usePresence`：退场动画写完就淡出，没写则立即卸载。
 * 消费者可通过默认插槽自定义遮罩内容（通常为空）。
 */
// Teleport 之外的 class 与 style 需要显式落到 DOM，禁用自动继承避免重复绑定。
defineOptions({ inheritAttrs: false });

const dialog = inject<UseDialogReturn>('dialog');

if (!dialog) {
  throw new Error('DialogOverlay must be used within DialogRoot');
}

const presence = usePresence({ present: () => dialog.isOpen.value });

const overlayProps = dialog.getOverlayProps();
</script>

<template>
  <Teleport :to="dialog.portalTarget.value">
    <div
      v-if="presence.isPresent.value"
      :ref="presence.setElement"
      v-bind="{ ...overlayProps, ...$attrs }"
      data-part="overlay"
      :data-state="dialog.isOpen.value ? 'open' : 'closed'"
      @click="dialog.onOverlayClick"
    >
      <slot />
    </div>
  </Teleport>
</template>
