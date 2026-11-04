<script setup lang="ts">
import { toRef } from 'vue';

import { useToastViewport } from '@agile-plus/headless';

import { useComponentContext } from '../context';

import type { ToastViewportProps } from './types';

/**
 * 通知视口：所有通知的 portal 目标与键盘可达性负责人。
 *
 * 结构固定为「region 包裹层 + 焦点代理 + ol + 焦点代理」。包裹层承担 aria-label 与
 * 暂停/恢复事件源，`ol` 才是通知本体的父节点；两者职责不同，所以本部件不开放
 * `as` / `asChild`。
 *
 * 消费者传入的 class / style 落到 `ol` 上（与 Radix 把 props 展开到 Primitive.ol
 * 一致），定位样式因此写在列表而不是包裹层。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ToastViewportProps>(), {
  hotkey: () => ['F8'],
  label: 'Notifications ({hotkey})',
});

const provider = useComponentContext('toastProvider');

const viewport = useToastViewport({
  provider,
  hotkey: toRef(() => props.hotkey),
  label: toRef(() => props.label),
});
</script>

<template>
  <div
    :ref="viewport.bindWrapper"
    v-bind="viewport.getWrapperProps()"
    data-part="viewport"
    @focusin="viewport.onWrapperFocusin"
    @focusout="viewport.onWrapperFocusout"
    @pointermove="viewport.onWrapperPointermove"
    @pointerleave="viewport.onWrapperPointerleave"
  >
    <span
      v-if="viewport.hasToasts.value"
      :ref="viewport.bindHeadProxy"
      v-bind="viewport.getHeadProxyProps()"
      data-part="focus-proxy"
      @focus="viewport.onHeadProxyFocus"
    />

    <ol
      :ref="viewport.bindList"
      v-bind="{ ...viewport.getListProps(), ...$attrs }"
      data-part="viewport-list"
      @keydown="viewport.onListKeydown"
    >
      <slot />
    </ol>

    <span
      v-if="viewport.hasToasts.value"
      :ref="viewport.bindTailProxy"
      v-bind="viewport.getTailProxyProps()"
      data-part="focus-proxy"
      @focus="viewport.onTailProxyFocus"
    />
  </div>
</template>
