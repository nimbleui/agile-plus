<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useDropdownMenu } from '@agile-plus/headless';

import type { PropType } from 'vue';

import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy, UseDropdownMenuReturn } from '@agile-plus/headless';

import type { DropdownMenuRootEmits } from './types';

/**
 * DropdownMenu 根组件：持有开合 / 定位 / 项注册表并下发上下文，不渲染元素。
 * 浮层内容由 Content 的 usePresence 懒渲染，打开才挂载；Content 给了 `keepMounted`
 * 则打开过一次之后常驻不销毁。
 */
const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  onOpenChange: { type: Function as PropType<(open: boolean) => void>, default: undefined },
  onSelect: { type: Function as PropType<(id: string) => void>, default: undefined },
  placement: { type: String as PropType<FloatingPlacement>, default: undefined },
  offset: { type: [Number, Object] as PropType<number | FloatingOffset>, default: undefined },
  flip: { type: Boolean, default: undefined },
  shift: { type: Boolean, default: undefined },
  padding: { type: Number, default: undefined },
  strategy: { type: String as PropType<FloatingStrategy>, default: undefined },
  loop: { type: Boolean, default: true },
});

const emit = defineEmits<DropdownMenuRootEmits>();

const menu = useDropdownMenu({
  ...props,
  open: toRef(() => props.open),
  onOpenChange: (value) => {
    props.onOpenChange?.(value);
    emit('update:open', value);
  },
  // 不声明 onItemSelect 属性：`item-select` 的监听器同名，声明后父级同时用 v-bind 转发
  // 和 @item-select 绑定时会合并成数组，直接调用就抛错；交给 emit，Vue 自己处理数组形态。
  onSelect: (id) => {
    props.onSelect?.(id);
    emit('item-select', id);
  },
});

provide('dropdownMenu', menu);

defineExpose({
  open: menu.open,
  close: menu.close,
  isOpen: menu.isOpen,
} satisfies Partial<UseDropdownMenuReturn>);
</script>

<template>
  <slot />
</template>
