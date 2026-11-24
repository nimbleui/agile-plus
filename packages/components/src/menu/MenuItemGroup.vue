<script setup lang="ts">
import { MenuItemGroup as MenuItemGroupPrimitive } from '@agile-plus/ui/menu';

import type { MenuItemGroupProps } from '@agile-plus/ui/menu';

/** 带样式的菜单分组。 */
const props = withDefaults(defineProps<MenuItemGroupProps>(), {
  title: undefined,
});
</script>

<template>
  <MenuItemGroupPrimitive v-bind="props" class="y-menu__group">
    <slot />
  </MenuItemGroupPrimitive>
</template>
