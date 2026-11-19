<script setup lang="ts">
import { DropdownMenuCheckboxItem as CheckboxItemPrimitive } from '@agile-plus/ui/dropdown-menu';

import type { DropdownMenuCheckboxItemProps } from '@agile-plus/ui/dropdown-menu';

/** 带样式的可勾选菜单项。 */
const props = withDefaults(defineProps<DropdownMenuCheckboxItemProps>(), {
  checked: undefined,
  defaultChecked: false,
  disabled: false,
  textValue: undefined,
  as: 'div',
  asChild: false,
});

const emit = defineEmits<{ 'update:checked': [value: boolean] }>();
</script>

<template>
  <CheckboxItemPrimitive
    v-bind="props"
    class="y-dropdown-menu__item"
    @update:checked="(v) => emit('update:checked', v)"
  >
    <slot />
  </CheckboxItemPrimitive>
</template>
