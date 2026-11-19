<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef } from 'vue';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { DropdownMenuItemProps } from './types';

/**
 * DropdownMenu 普通项。以消费者 value 登记进菜单注册表（顺序即导航顺序），卸载注销；
 * 懒渲染下关闭即卸载、打开重新登记，Content 常驻（`keepMounted`）时登记一直留着。
 */
const props = withDefaults(defineProps<DropdownMenuItemProps>(), {
  disabled: false,
  textValue: undefined,
  as: 'div',
  asChild: false,
});

const menu = useComponentContext('dropdownMenu');

const element = ref<HTMLElement | null>(null);

const textValue = computed(() => props.textValue ?? element.value?.textContent ?? '');

const unregister = menu.registerItem({
  value: toRef(() => props.value),
  disabled: toRef(() => props.disabled),
  textValue,
  element,
  kind: 'item',
});

onBeforeUnmount(unregister);

const itemProps = computed(() => menu.getItemProps(props.value));

function setElement(node: unknown): void {
  element.value = node instanceof HTMLElement ? node : null;
}
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="setElement"
    v-bind="itemProps"
    data-part="item"
    @pointermove="menu.onItemPointerMove(props.value)"
    @click="menu.onItemClick(props.value)"
  >
    <slot />
  </Slot>
</template>
