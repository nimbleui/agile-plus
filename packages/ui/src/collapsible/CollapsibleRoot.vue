<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useCollapsible } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { UseCollapsibleReturn } from '@agile-plus/headless';

import type { CollapsibleRootEmits } from './types';

/**
 * 折叠区根组件。
 *
 * 不渲染额外结构，只创建 Composable 实例并把 API 分发给 Trigger 与 Content。
 * 用运行时声明并显式给出 default: undefined：类型写法下 Vue 会把 boolean prop 在缺失时
 * 转成 false，而 useCollapsible 用 undefined 判定「是否受控」，否则只写 defaultOpen 的
 * 非受控用法会被误判成「受控且恒为收起」。
 */
const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  as: { type: String, default: 'div' },
  asChild: { type: Boolean, default: false },
});

const emit = defineEmits<CollapsibleRootEmits>();

const collapsible = useCollapsible({
  open: toRef(() => props.open),
  defaultOpen: props.defaultOpen,
  disabled: toRef(() => props.disabled),
  onOpenChange: (value) => emit('update:open', value),
});

provide<UseCollapsibleReturn>('collapsible', collapsible);
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="collapsible.getRootAttrs()"
    data-part="root"
  >
    <slot :open="collapsible.isOpen" :disabled="collapsible.isDisabled" />
  </Slot>
</template>
