<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef } from 'vue';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { DropdownMenuCheckboxItemProps } from './types';

/**
 * DropdownMenu 的可勾选菜单项。
 *
 * role="menuitemcheckbox"，勾选态自持（受控/非受控双模式），点击先翻转勾选再走菜单的
 * 激活流程（上报 onSelect 并关闭）。勾选态不经无头层：它是项自己的状态，不是菜单的状态。
 */
const props = withDefaults(defineProps<DropdownMenuCheckboxItemProps>(), {
  checked: undefined,
  defaultChecked: false,
  disabled: false,
  textValue: undefined,
  as: 'div',
  asChild: false,
});

const emit = defineEmits<{ 'update:checked': [value: boolean] }>();

const menu = useComponentContext('dropdownMenu');

const element = ref<HTMLElement | null>(null);

const internalChecked = ref(props.defaultChecked);

const isChecked = computed(() => props.checked ?? internalChecked.value);

const textValue = computed(() => props.textValue ?? element.value?.textContent ?? '');

const unregister = menu.registerItem({
  value: toRef(() => props.value),
  disabled: toRef(() => props.disabled),
  textValue,
  element,
  kind: 'checkbox',
});

onBeforeUnmount(unregister);

const itemProps = computed(() => menu.getItemProps(props.value));

function setElement(node: unknown): void {
  element.value = node instanceof HTMLElement ? node : null;
}

function onPointerMove(): void {
  menu.onItemPointerMove(props.value);
}

function onClick(): void {
  const next = !isChecked.value;

  if (props.checked === undefined) internalChecked.value = next;

  props.onCheckedChange?.(next);
  emit('update:checked', next);

  menu.onItemClick(props.value);
}
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="setElement"
    v-bind="{ ...itemProps, 'aria-checked': isChecked }"
    data-part="item"
    @pointermove="onPointerMove"
    @click="onClick"
  >
    <slot />
  </Slot>
</template>
