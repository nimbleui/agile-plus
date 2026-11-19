<script setup lang="ts">
import { DropdownMenuSeparator as SeparatorPrimitive } from '@agile-plus/ui/dropdown-menu';

import type { DropdownMenuSeparatorProps } from '@agile-plus/ui/dropdown-menu';

/** 带样式的菜单分隔线。 */
const props = withDefaults(defineProps<DropdownMenuSeparatorProps>(), {
  as: 'div',
  asChild: false,
});
</script>

<template>
  <SeparatorPrimitive v-bind="props" class="y-dropdown-menu__separator" />
</template>
