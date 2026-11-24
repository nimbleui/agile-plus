<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue';

import { TooltipArrow, TooltipContent } from '../tooltip';
import { Slot } from '../slot';
import { useComponentContext } from '../context';
import { useMenuTooltip } from './useMenuTooltip';

import type { MenuSubTriggerProps } from './types';

/** 子菜单触发器：负责展开、层级键盘导航与折叠提示。 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<MenuSubTriggerProps>(), {
  textValue: undefined,
  as: 'button',
  asChild: false,
  tooltipClass: undefined,
});

const menu = useComponentContext('menu');
const sub = useComponentContext('menuSub');
const id = sub.id;
const element = ref<HTMLElement | null>(null);
const openedByHover = ref(false);

const disabled = computed(() => sub.disabled.value);
const textValue = computed(() => props.textValue ?? element.value?.textContent ?? '');

const unregister = menu.registerItem({
  id: ref(id),
  value: sub.value,
  parentValue: sub.parentValue,
  textValue,
  element,
  disabled,
  kind: 'sub',
});

onScopeDispose(unregister);

const tooltip = useMenuTooltip({
  enabled: computed(() => menu.isCollapsed.value && !disabled.value),
  setElement: (node) => {
    element.value = node;
    sub.setTriggerElement(node);
  },
});

const itemAttrs = computed(() => menu.getItemAttrs(id));
const typeAttrs = computed(() =>
  props.asChild || props.as !== 'button' ? {} : { type: 'button' }
);
const tooltipArrowClass = computed(() =>
  props.tooltipClass ? `${props.tooltipClass}__arrow` : undefined
);

function setReference(node: unknown): void {
  tooltip.setReference(node);
}

function onPointerEnter(event: PointerEvent): void {
  tooltip.onPointerEnter();

  if (menu.isInline.value || disabled.value || event.pointerType === 'touch') return;

  openedByHover.value = true;
  menu.cancelSubClosePath(sub.value.value);
  menu.openSub(sub.value.value);
}

function onPointerLeave(event: PointerEvent): void {
  tooltip.onPointerLeave();

  if (!menu.isInline.value && !disabled.value) {
    menu.scheduleSubClose(sub.value.value, event.relatedTarget);
  }
}

function onClick(event: MouseEvent): void {
  if (disabled.value) {
    event.preventDefault();
    event.stopPropagation();

    return;
  }

  if (!menu.isInline.value && openedByHover.value && event.detail > 0 && sub.open.value) {
    openedByHover.value = false;

    return;
  }

  openedByHover.value = false;
  menu.toggleSub(sub.value.value);
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
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="setReference"
    v-bind="{ ...typeAttrs, ...itemAttrs, ...tooltip.triggerProps.value, ...$attrs }"
    data-part="submenu-trigger"
    @click="onClick"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @focus="onFocus"
    @blur="tooltip.onBlur"
    @keydown="onKeydown"
  >
    <slot v-if="props.asChild" />
    <template v-else>
      <slot />
      <span data-part="submenu-arrow" aria-hidden="true"><slot name="arrow" /></span>
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
</template>
