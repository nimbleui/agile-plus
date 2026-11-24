<script setup lang="ts">
import { computed, inject, onScopeDispose, ref, toRef, useId } from 'vue';

import { TooltipArrow, TooltipContent } from '../tooltip';
import { Slot } from '../slot';
import { useComponentContext } from '../context';
import { useMenuTooltip } from './useMenuTooltip';

import type { MenuSubContext, MenuItemProps } from './types';

/** 普通导航菜单项，负责链接/按钮语义、选中激活与折叠提示。 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<MenuItemProps>(), {
  href: undefined,
  target: undefined,
  rel: undefined,
  disabled: false,
  danger: false,
  textValue: undefined,
  as: undefined,
  asChild: false,
  tooltipClass: undefined,
});

const menu = useComponentContext('menu');
const parent = inject<MenuSubContext | undefined>('menuSub', undefined);
const id = useId();
const element = ref<HTMLElement | null>(null);

const disabled = computed(() => menu.isDisabled.value || props.disabled);
const textValue = computed(() => props.textValue ?? element.value?.textContent ?? '');

const unregister = menu.registerItem({
  id: ref(id),
  value: toRef(() => props.value),
  parentValue: computed(() => parent?.value.value ?? null),
  textValue,
  element,
  disabled: toRef(() => props.disabled),
  kind: 'item',
});

onScopeDispose(unregister);

const tooltip = useMenuTooltip({
  enabled: computed(() => menu.isCollapsed.value && !disabled.value),
  setElement: (node) => {
    element.value = node;
  },
});

const itemAttrs = computed(() => menu.getItemAttrs(id));
const tag = computed(() => props.as ?? (props.href ? 'a' : 'button'));
const linkAttrs = computed(() =>
  tag.value === 'a' && !disabled.value
    ? { href: props.href, target: props.target, rel: props.rel }
    : {}
);
const typeAttrs = computed(() => (tag.value === 'button' ? { type: 'button' } : {}));
const tooltipArrowClass = computed(() =>
  props.tooltipClass ? `${props.tooltipClass}__arrow` : undefined
);

function setReference(node: unknown): void {
  tooltip.setReference(node);
}

function onClick(event: MouseEvent): void {
  if (!disabled.value) {
    menu.selectItem(props.value);

    return;
  }

  event.preventDefault();
  event.stopPropagation();
}

function onPointerEnter(): void {
  menu.onItemPointerEnter(id);
  tooltip.onPointerEnter();
}

function onFocus(): void {
  menu.onItemFocus(id);
  tooltip.onFocus();
}

function onKeydown(event: KeyboardEvent): void {
  menu.onItemKeydown(event, id);
  tooltip.onKeydown(event);
}
</script>

<template>
  <li v-bind="$attrs" role="none" data-part="item" :data-value="String(props.value)">
    <Slot
      :as="tag"
      :as-child="props.asChild"
      :el-ref="setReference"
      v-bind="{ ...itemAttrs, ...tooltip.triggerProps.value, ...linkAttrs, ...typeAttrs }"
      data-part="item-content"
      :data-danger="props.danger ? '' : undefined"
      @click="onClick"
      @pointerenter="onPointerEnter"
      @pointerleave="tooltip.onPointerLeave"
      @focus="onFocus"
      @blur="tooltip.onBlur"
      @keydown="onKeydown"
    >
      <slot v-if="props.asChild" />
      <template v-else>
        <span v-if="$slots.icon" data-part="icon" aria-hidden="true"><slot name="icon" /></span>
        <span data-part="title"><slot /></span>
        <span v-if="$slots.suffix" data-part="suffix"><slot name="suffix" /></span>
      </template>
    </Slot>

    <TooltipContent
      v-if="menu.isCollapsed.value && !disabled"
      :class="props.tooltipClass"
      :container="menu.container.value"
    >
      <slot name="tooltip">{{ textValue }}</slot>
      <TooltipArrow :class="tooltipArrowClass" />
    </TooltipContent>
  </li>
</template>
