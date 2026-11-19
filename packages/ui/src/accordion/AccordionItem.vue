<script setup lang="ts">
import { computed, onMounted, onScopeDispose, provide, ref, useId, watch } from 'vue';

import { useCollapsible } from '@agile-plus/headless';

import { getAccordionItemAttrs } from '@agile-plus/primitives/accordion';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { AccordionItemContext, AccordionItemProps } from './types';

/**
 * 手风琴的一个项。
 *
 * 内部复用 Collapsible：展开态不是项自己的状态，而是「组的值里是否包含自己」，
 * 写回时交给组去转移（single 替换 / multiple 增删，并受 collapsible 闸门约束）。
 * 因此项上没有 open 属性，避免两处真源。
 *
 * Trigger 元素由子组件 AccordionTrigger 通过上下文里的 setTriggerElement 回填；
 * 项在挂载后把它登记进组的键盘导航集合（登记存 Ref 而非快照，焦点导航读到的是当下元素）。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<AccordionItemProps>(), {
  disabled: false,
  as: 'div',
  asChild: false,
});

const accordion = useComponentContext('accordion');

const id = useId();

const triggerElement = ref<HTMLElement | null>(null);

const itemValue = computed(() => props.value);

const disabled = computed(() => accordion.disabled.value || props.disabled);

const collapsible = useCollapsible({
  open: () => accordion.isItemOpen(props.value),
  disabled: () => disabled.value,
  onOpenChange: (open) => accordion.setItemOpen(props.value, open),
});

function setTriggerElement(node: unknown): void {
  triggerElement.value = node instanceof HTMLElement ? node : null;
}

const itemContext: AccordionItemContext = {
  collapsible,
  itemValue,
  disabled,
  id,
  triggerElement,
  setTriggerElement,
};

provide('accordionItem', itemContext);

/**
 * 登记发生在挂载之后：Trigger 子元素先于父级 onMounted 完成 :ref 回填，
 * 此时集合里拿到的才是真实按钮。value 变化时重新登记，保证导航读到新值。
 */
let unregister: (() => void) | null = null;

function register(): void {
  unregister?.();

  unregister = accordion.registerItem({ id, value: props.value, element: triggerElement, disabled });
}

onMounted(register);

watch(
  () => props.value,
  () => {
    if (unregister) register();
  }
);

onScopeDispose(() => {
  unregister?.();
  unregister = null;
});

const itemAttrs = computed(() =>
  getAccordionItemAttrs({ open: collapsible.isOpen.value, disabled: disabled.value })
);
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...itemAttrs, ...$attrs }"
    data-part="item"
  >
    <slot :open="collapsible.isOpen" :disabled="disabled" />
  </Slot>
</template>