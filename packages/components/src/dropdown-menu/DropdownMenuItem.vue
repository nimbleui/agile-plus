<script setup lang="ts">
import { DropdownMenuItem as ItemPrimitive } from '@agile-plus/ui/dropdown-menu';

import type { DropdownMenuItemProps } from '@agile-plus/ui/dropdown-menu';

/** 带样式的菜单项。 */
const props = withDefaults(defineProps<DropdownMenuItemProps>(), {
  disabled: false,
  as: 'div',
  asChild: false,
});
</script>

<template>
  <ItemPrimitive v-bind="props" class="y-dropdown-menu__item">
    <slot />
  </ItemPrimitive>
</template>
