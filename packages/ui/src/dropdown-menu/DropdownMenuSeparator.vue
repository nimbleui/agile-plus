<script setup lang="ts">
import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { DropdownMenuSeparatorProps } from './types';

/** DropdownMenu 分隔线（非选项，不参与导航）。 */
const props = withDefaults(defineProps<DropdownMenuSeparatorProps>(), {
  as: 'div',
  asChild: false,
});

const menu = useComponentContext('dropdownMenu');
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="menu.getSeparatorProps()">
    <slot />
  </Slot>
</template>
