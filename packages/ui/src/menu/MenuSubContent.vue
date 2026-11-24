<script setup lang="ts">
import { computed, watch } from 'vue';

import { useFloating } from '@agile-plus/headless';

import { parsePlacement } from '@agile-plus/primitives/floating';

import { Slot } from '../slot';
import { useComponentContext } from '../context';

import type { FloatingPlacement } from '@agile-plus/primitives/floating';

import type { MenuSubContentProps } from './types';

/** 子菜单内容：inline 原地展开，其余模式 Teleport 到 body 并 Floating 定位。 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<MenuSubContentProps>(), {
  as: 'ul',
  asChild: false,
  forceMount: false,
});

const menu = useComponentContext('menu');
const sub = useComponentContext('menuSub');

const placement = computed<FloatingPlacement>(() =>
  menu.mode.value === 'horizontal' && sub.depth.value === 0 ? 'bottom-start' : 'right-start'
);

const floating = useFloating({
  placement,
  offset: 4,
  flip: true,
  shift: true,
  padding: 8,
  open: sub.open,
});

watch(
  sub.triggerElement,
  (element) => {
    floating.referenceRef.value = element;
  },
  { immediate: true }
);

watch(placement, () => floating.update());

const isPopup = computed(() => !menu.isInline.value);
const contentAttrs = computed(() => menu.getSubContentAttrs(sub.id));
const side = computed(() => parsePlacement(floating.placement.value).side);
const contentStyle = computed(() =>
  isPopup.value
    ? {
        ...floating.floatingStyle.value,
        '--y-menu-level': 0,
        '--y-menu-depth': sub.depth.value,
      }
    : { '--y-menu-level': sub.depth.value + 1 }
);

function setElement(node: unknown): void {
  const element = node instanceof HTMLElement ? node : null;

  floating.floatingRef.value = element;
  menu.setPopupElement(sub.id, element);
}
</script>

<template>
  <Teleport :to="menu.container.value" :disabled="!isPopup">
    <Slot
      v-if="!isPopup || sub.open.value || props.forceMount"
      :as="props.as"
      :as-child="props.asChild"
      :el-ref="setElement"
      v-bind="{ ...contentAttrs, ...$attrs }"
      :style="contentStyle"
      :data-side="side"
      data-part="submenu-content"
      @pointerenter="menu.cancelSubClosePath(sub.value.value)"
      @pointerleave="menu.scheduleSubClose(sub.value.value, $event.relatedTarget)"
    >
      <slot />
    </Slot>
  </Teleport>
</template>
