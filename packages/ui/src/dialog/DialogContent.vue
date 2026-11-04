<script setup lang="ts">
import { inject, nextTick, onMounted, watch } from 'vue';

import { usePresence } from '@agile-plus/headless';

import type { UseDialogReturn } from '@agile-plus/headless';

/**
 * Dialog 内容区域组件。
 *
 * 渲染为 role="dialog" 容器，自动绑定 aria-modal、aria-labelledby 等属性。
 * 打开时自动聚焦到内容区域以支持键盘交互（Escape 需要容器可聚焦），并把容器
 * 注册给 useDialog，由焦点陷阱与滚动锁管理生命周期。
 *
 * 是否留在 DOM 由共享的 `usePresence` 决定：给了 `@keyframes` 退场动画时等动画结束
 * 再卸载，没有动画时立即卸载，所以样式层不动就等于保持原有行为。焦点陷阱与滚动锁
 * 仍然只看 `isOpen`，退场期间不再拦焦点，也不会出现「已经关闭还能 Tab 进来」。
 */
// Teleport 不是真实 DOM 元素，class 与 style 必须显式绑定到内部 div 才能生效。
defineOptions({ inheritAttrs: false });

const dialog = inject<UseDialogReturn>('dialog');

if (!dialog) {
  throw new Error('DialogContent must be used within DialogRoot');
}

const presence = usePresence({ present: () => dialog.isOpen.value });

const contentProps = dialog.getContentProps();

watch(presence.element, (element) => dialog.setContentElement(element), { immediate: true });

/**
 * 焦点必须在元素出现后的下一帧写入。
 *
 * v-if 控制的容器在状态变化后才存在，同一 tick 内元素引用仍为 null，
 * 因此依赖 nextTick 而不是 setTimeout。
 */
async function focusContent(): Promise<void> {
  await nextTick();

  presence.element.value?.focus();
}

onMounted(() => {
  if (dialog.isOpen.value) {
    focusContent();
  }
});

watch(
  () => dialog.isOpen.value,
  (value) => {
    if (value) {
      focusContent();
    }
  }
);
</script>

<template>
  <Teleport :to="dialog.portalTarget.value">
    <div
      v-if="presence.isPresent.value"
      :ref="presence.setElement"
      v-bind="{ ...contentProps, ...$attrs }"
      data-part="content"
      :data-state="dialog.isOpen.value ? 'open' : 'closed'"
      @keydown="dialog.onContentKeydown"
    >
      <slot :close="dialog.close" />
    </div>
  </Teleport>
</template>
