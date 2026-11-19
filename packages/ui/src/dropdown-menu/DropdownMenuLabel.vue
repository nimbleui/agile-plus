<script setup lang="ts">
import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { DropdownMenuLabelProps } from './types';

/** DropdownMenu 分组标题（非选项，不参与导航）。 */
const props = withDefaults(defineProps<DropdownMenuLabelProps>(), {
  as: 'div',
  asChild: false,
});

const menu = useComponentContext('dropdownMenu');
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="menu.getLabelProps()">
    <slot />
  </Slot>
</template>
