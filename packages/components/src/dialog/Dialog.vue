<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@agile-plus/ui/dialog';

import type { PropType } from 'vue';

import type { DialogRootEmits } from '@agile-plus/ui';

/**
 * 带样式的 Dialog 组件。
 *
 * 封装 UI 层的复合组件并注入样式，提供开箱即用的对话框体验。
 * 支持 v-model:open 双向绑定，所有 props 透传给底层 DialogRoot。
 *
 * @example
 * ```vue
 * <Dialog v-model:open="visible">
 *   <Dialog.Trigger>打开</Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Title>确认操作</Dialog.Title>
 *     <Dialog.Description>此操作不可撤销，是否继续？</Dialog.Description>
 *     <Dialog.Close>取消</Dialog.Close>
 *   </Dialog.Content>
 * </Dialog>
 * ```
 */
/**
 * Boolean prop 有两个必须显式处理的陷阱，因此这里用运行时声明：
 *
 * 1. 未传入的 boolean prop 会被转成 false，若省略各默认值，false 会透传给 DialogRoot
 *    并覆盖它自己的 true 默认值，closeOnEscape / closeOnOverlayClick 静默失效。
 * 2. open 必须以「未提供」为前提传给下层：useDialog 用 undefined 判断是否受控，
 *    open 被转成 false 会让非受控用法（只写 defaultOpen）永远打不开。
 */
const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  closeOnEscape: { type: Boolean, default: true },
  closeOnOverlayClick: { type: Boolean, default: true },
  container: { type: Object as PropType<HTMLElement>, default: undefined },
});

const emit = defineEmits<DialogRootEmits>();

defineSlots<{
  trigger(): unknown;
  default(): unknown;
  title(): unknown;
  description(): unknown;
}>();
</script>

<template>
  <DialogRoot v-bind="props" @update:open="(v) => emit('update:open', v)">
    <DialogTrigger>
      <slot name="trigger" />
    </DialogTrigger>

    <DialogOverlay class="y-dialog" data-part="overlay" />

    <DialogContent class="y-dialog" data-part="content">
      <DialogTitle class="y-dialog" data-part="title">
        <slot name="title" />
      </DialogTitle>

      <DialogDescription class="y-dialog" data-part="description">
        <slot name="description" />
      </DialogDescription>

      <slot />

      <DialogClose class="y-dialog__close">
        <span aria-hidden="true">&times;</span>
      </DialogClose>
    </DialogContent>
  </DialogRoot>
</template>

<style lang="scss">
@use './Dialog.scss';
</style>
