<script setup lang="ts">
import { computed, inject, provide, ref, useId } from 'vue';

import { Slot } from '../slot';
import { useComponentContext } from '../context';

import type { MenuSubContext, MenuSubProps } from './types';

/** 子菜单容器：只建立层级上下文，不持有独立开合状态。 */
const props = withDefaults(defineProps<MenuSubProps>(), {
  disabled: false,
});

const menu = useComponentContext('menu');
const parent = inject<MenuSubContext | undefined>('menuSub', undefined);
const id = useId();
const triggerElement = ref<HTMLElement | null>(null);

const value = computed(() => props.value);
const parentValue = computed(() => parent?.value.value ?? null);
const depth = computed(() => (parent?.depth.value ?? -1) + 1);
const disabled = computed(
  () => menu.isDisabled.value || parent?.disabled.value === true || props.disabled
);
const open = computed(() => menu.isSubOpen(props.value));

const context: MenuSubContext = {
  id,
  value,
  parentValue,
  depth,
  disabled,
  open,
  triggerElement,
  setTriggerElement: (node) => {
    triggerElement.value = node;
  },
};

provide('menuSub', context);
</script>

<template>
  <Slot
    as="li"
    v-bind="$attrs"
    role="none"
    data-part="submenu"
    :data-value="String(props.value)"
    :data-state="open ? 'open' : 'closed'"
    :data-disabled="disabled ? '' : undefined"
  >
    <slot />
  </Slot>
</template>
