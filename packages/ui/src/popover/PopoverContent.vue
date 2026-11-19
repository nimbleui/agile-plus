<script setup lang="ts">
import { computed, nextTick, onMounted, watch } from 'vue';

import { useKeepMounted, usePresence } from '@agile-plus/headless';

import { parsePlacement } from '@agile-plus/primitives/floating';

import { useComponentContext } from '../context';

import type { PopoverContentProps } from './types';

/**
 * Popover 内容。默认**懒渲染**：关闭即卸载（v-if 由 usePresence 驱动），打开才挂载；
 * 给了退场动画就等动画结束再卸载。`keepMounted` 让内容打开过一次之后常驻，`forceMount`
 * 完全接管进出场——两种常驻都要由样式层负责把 closed 状态藏干净。
 * 打开时把焦点移进浮层（非模态，不做陷阱）。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<PopoverContentProps>(), {
  container: 'body',
  forceMount: false,
  keepMounted: false,
});

const popover = useComponentContext('popover');

const retention = useKeepMounted({ open: popover.isOpen, enabled: () => props.keepMounted });

const presence = usePresence({
  present: () => props.forceMount || retention.keepMounted.value || popover.isOpen.value,
});

const contentProps = computed(() => popover.getContentProps());

const side = computed(() => parsePlacement(popover.floating.placement.value).side);

function setContentElement(node: unknown): void {
  presence.setElement(node);
  popover.setContentElement(node);
}

async function focusContent(): Promise<void> {
  await nextTick();

  presence.element.value?.focus();
}

onMounted(() => {
  if (popover.isOpen.value) focusContent();
});

watch(
  () => popover.isOpen.value,
  (open) => {
    if (open) focusContent();
  }
);
</script>

<template>
  <Teleport :to="props.container">
    <div
      v-if="presence.isPresent.value"
      :ref="setContentElement"
      v-bind="{ ...contentProps, ...$attrs }"
      :style="popover.floating.floatingStyle.value"
      :data-side="side"
      data-part="content"
      @keydown="popover.onContentKeydown"
    >
      <slot :close="popover.close" />
    </div>
  </Teleport>
</template>
