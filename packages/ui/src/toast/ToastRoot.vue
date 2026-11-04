<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useToast } from '@agile-plus/headless';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { ToastRootEmits, ToastRootProps } from './types';

/**
 * 一条通知。
 *
 * 本体被 teleport 进视口的列表里，因此它必须等视口存在才渲染——与 Radix 一致：
 * Provider 拿不到 viewport 时通知返回 null。顺序无关紧要，`ToastViewport` 晚挂载
 * 时这里的 v-if 会随响应式目标一起补上。
 *
 * 同时存在第二个出口：读屏用的 announcer 要落在 `announceContainer`（默认 body），
 * 不能跟着通知进视口，否则 aria-live 区域会因为位于 region 内部而在部分读屏里
 * 不播报。
 *
 * 元素引用通过 `el-ref` 交给 Slot：Presence 要在元素上监听动画事件，Tab 候选与
 * announcer 文本都要读这个元素，而模板 ref 在 Slot 上只会拿到组件实例。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ToastRootProps>(), {
  // 必须显式写成 undefined：Boolean prop 缺省时 Vue 会 cast 成 false，
  // 受控判定（open !== undefined）就此失效，通知会变成「受控且始终关闭」而永不渲染。
  open: undefined,
  defaultOpen: true,
  duration: undefined,
  type: 'foreground',
  forceMount: false,
  as: 'li',
  asChild: false,
});

const emit = defineEmits<ToastRootEmits>();

const provider = useComponentContext('toastProvider');

const toast = useToast({
  provider,
  // open 不设默认值：Boolean prop 缺省会被 cast 成 false，受控判定就此失效。
  open: toRef(() => props.open),
  defaultOpen: props.defaultOpen,
  duration: toRef(() => props.duration),
  type: toRef(() => props.type),
  forceMount: toRef(() => props.forceMount),
  onOpenChange: (value) => emit('update:open', value),
  onEscapeKeyDown: (event) => emit('escape-keydown', event),
  onPause: () => emit('pause'),
  onResume: () => emit('resume'),
  onSwipeStart: (detail) => emit('swipe-start', detail),
  onSwipeMove: (detail) => emit('swipe-move', detail),
  onSwipeCancel: (detail) => emit('swipe-cancel', detail),
  onSwipeEnd: (detail) => emit('swipe-end', detail),
});

provide('toast', toast);
</script>

<template>
  <Teleport v-if="toast.isPresent.value && provider.viewport.value" :to="provider.viewport.value">
    <Slot
      :as="props.as"
      :as-child="props.asChild"
      :el-ref="toast.bindElement"
      v-bind="{ ...toast.getRootProps(), ...$attrs }"
      data-part="root"
      @keydown="toast.onRootKeydown"
      @pointerdown="toast.onRootPointerdown"
      @pointermove="toast.onRootPointermove"
      @pointerup="toast.onRootPointerup"
    >
      <slot :close="toast.close" />
    </Slot>
  </Teleport>

  <Teleport
    v-if="toast.isPresent.value && toast.isAnnounceVisible.value"
    :to="toast.announceTarget.value"
  >
    <div v-bind="toast.getAnnounceProps()">
      <template v-if="toast.announceText.value">
        {{ toast.announceLabel.value }}
        <template v-for="(part, index) in toast.announceText.value" :key="index">
          {{ part }}
        </template>
      </template>
    </div>
  </Teleport>
</template>
