<script setup lang="ts">
import { computed, provide, toRef } from 'vue';

import { useMenu } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { UseMenuReturn } from '@agile-plus/headless';

import type { MenuRootEmits, MenuRootProps } from './types';

/** 导航菜单根组件：持有选中/展开状态并向全部部件下发上下文。 */
const props = withDefaults(defineProps<MenuRootProps>(), {
  selectedKeys: undefined,
  defaultSelectedKeys: () => [],
  openKeys: undefined,
  defaultOpenKeys: () => [],
  mode: 'vertical',
  inlineCollapsed: false,
  accordion: false,
  multiple: false,
  selectable: true,
  disabled: false,
  container: 'body',
  as: 'ul',
  asChild: false,
});

const emit = defineEmits<MenuRootEmits>();

const menu = useMenu({
  mode: toRef(() => props.mode),
  selectedKeys: toRef(() => props.selectedKeys),
  defaultSelectedKeys: props.defaultSelectedKeys,
  openKeys: toRef(() => props.openKeys),
  defaultOpenKeys: props.defaultOpenKeys,
  multiple: toRef(() => props.multiple),
  selectable: toRef(() => props.selectable),
  disabled: toRef(() => props.disabled),
  accordion: toRef(() => props.accordion),
  inlineCollapsed: toRef(() => props.inlineCollapsed),
  container: toRef(() => props.container),
  onSelectedKeysChange: (keys) => emit('update:selectedKeys', keys),
  onSelect: (info) => emit('select', info),
  onOpenKeysChange: (keys) => emit('update:openKeys', keys),
  onOpenChange: (keys) => emit('openChange', keys),
});

provide('menu', menu);

const rootAttrs = computed(() => menu.getRootAttrs());

defineExpose({
  selectedKeys: menu.selectedKeys,
  openKeys: menu.openKeys,
  selectItem: menu.selectItem,
  openSub: menu.openSub,
  closeSub: menu.closeSub,
} satisfies Partial<UseMenuReturn>);
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="menu.setRootElement"
    v-bind="{ ...rootAttrs, ...$attrs }"
    data-part="root"
  >
    <slot />
  </Slot>
</template>
