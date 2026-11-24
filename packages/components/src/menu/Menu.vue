<script setup lang="ts">
import { MenuRoot } from '@agile-plus/ui/menu';

import type { MenuRootEmits, MenuRootProps } from '@agile-plus/ui';

/** 带样式的导航菜单根组件。 */
withDefaults(defineProps<MenuRootProps>(), {
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
</script>

<template>
  <MenuRoot
    v-bind="$props"
    class="y-menu"
    @update:selected-keys="(keys) => emit('update:selectedKeys', keys)"
    @select="(info) => emit('select', info)"
    @update:open-keys="(keys) => emit('update:openKeys', keys)"
    @open-change="(keys) => emit('openChange', keys)"
  >
    <slot />
  </MenuRoot>
</template>

<style lang="scss">
@use './Menu.scss';
</style>
