<script setup lang="ts">
import { useId } from 'vue';

import { Slot } from '../slot';
import { useComponentContext } from '../context';

import type { MenuItemGroupProps } from './types';

/** 菜单分组：提供分组标题与 group 语义，不参与选中。 */
const props = withDefaults(defineProps<MenuItemGroupProps>(), {
  title: undefined,
});

useComponentContext('menu');

const labelId = `menu-group-${useId()}`;
</script>

<template>
  <Slot as="li" v-bind="$attrs" role="none" data-part="group">
    <div :id="labelId" role="presentation" data-part="group-label">
      <slot name="title">{{ props.title }}</slot>
    </div>
    <ul role="group" :aria-labelledby="labelId" data-part="group-list">
      <slot />
    </ul>
  </Slot>
</template>
