<script setup lang="ts">
import { MenuItem as MenuItemPrimitive } from '@agile-plus/ui/menu';

import type { MenuItemProps } from '@agile-plus/ui/menu';

/** 带样式的导航菜单项。 */
const props = withDefaults(defineProps<MenuItemProps>(), {
  href: undefined,
  target: undefined,
  rel: undefined,
  disabled: false,
  danger: false,
  textValue: undefined,
  as: undefined,
  asChild: false,
  tooltipClass: undefined,
});
</script>

<template>
  <MenuItemPrimitive v-bind="props" class="y-menu__item" tooltip-class="y-tooltip">
    <template v-if="$slots.icon" #icon><slot name="icon" /></template>
    <slot />
    <template v-if="$slots.suffix" #suffix><slot name="suffix" /></template>
    <template v-if="$slots.tooltip" #tooltip><slot name="tooltip" /></template>
  </MenuItemPrimitive>
</template>
