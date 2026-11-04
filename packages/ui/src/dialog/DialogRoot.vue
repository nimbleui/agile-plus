<script setup lang="ts">
import { provide, toRef, type PropType } from 'vue';

import { useDialog } from '@agile-plus/headless';

import type { UseDialogReturn } from '@agile-plus/headless';

import type { DialogRootEmits } from './types';

/**
 * Dialog 根组件，作为复合组件的上下文提供者。
 *
 * 不渲染任何 DOM 元素，仅负责创建 Composable 实例并通过 provide/inject
 * 将 API 分发给子组件（Trigger、Content、Overlay、Close 等）。
 * 支持 v-model:open 双向绑定。
 *
 * `container` 放在根上而不是各部件上：遮罩与内容必须传送到同一个目标，
 * 分成两个属性会让消费者有机会把两层写到不同层级。
 *
 * 用运行时声明并显式给出 default: undefined：类型写法下 Vue 把 boolean prop 在缺失时
 * 转成 false，而 useDialog 用 undefined 判定「是否受控」，否则只传 defaultOpen 的
 * 非受控用法会被误判成「受控且恒为关闭」，永远打不开。
 */
const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  closeOnEscape: { type: Boolean, default: true },
  closeOnOverlayClick: { type: Boolean, default: true },
  container: { type: Object as PropType<HTMLElement>, default: undefined },
});

const emit = defineEmits<DialogRootEmits>();

// 以 getter 形式交给 Composable，保证外部 open 变化能被持续读取。
const dialog = useDialog({
  ...props,
  open: toRef(() => props.open),
  container: toRef(() => props.container),
  onOpenChange: (value) => emit('update:open', value),
});

provide('dialog', dialog);

defineExpose({
  open: dialog.open,
  close: dialog.close,
  toggle: dialog.toggle,
  isOpen: dialog.isOpen,
} satisfies Partial<UseDialogReturn>);
</script>

<template>
  <slot />
</template>
