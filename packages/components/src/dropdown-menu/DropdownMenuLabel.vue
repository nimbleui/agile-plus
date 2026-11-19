<script setup lang="ts">
import { DropdownMenuLabel as LabelPrimitive } from '@agile-plus/ui/dropdown-menu';

import type { DropdownMenuLabelProps } from '@agile-plus/ui/dropdown-menu';

/** 带样式的菜单分组标题。 */
const props = withDefaults(defineProps<DropdownMenuLabelProps>(), {
  as: 'div',
  asChild: false,
});
</script>

<template>
  <LabelPrimitive v-bind="props" class="y-dropdown-menu__label">
    <slot />
  </LabelPrimitive>
</template>
