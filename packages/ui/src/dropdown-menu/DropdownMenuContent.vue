<script setup lang="ts">
import { computed } from 'vue';

import { useKeepMounted, usePresence } from '@agile-plus/headless';

import { parsePlacement } from '@agile-plus/primitives/floating';

import { useComponentContext } from '../context';

import type { DropdownMenuContentProps } from './types';

/**
 * DropdownMenu 内容。默认**懒渲染**（v-if 由 usePresence 驱动，关闭即卸载、打开才挂载；
 * 给了退场动画就等动画结束再卸载）。`keepMounted` 让内容打开过一次之后常驻，`forceMount`
 * 完全接管进出场——两种常驻都要由样式层负责把 closed 状态藏干净。
 * 焦点由无头层 roving focus 管理（落首/末项、方向键移动），本层不重复做焦点管理。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<DropdownMenuContentProps>(), {
  container: 'body',
  forceMount: false,
  keepMounted: false,
});

const menu = useComponentContext('dropdownMenu');

/**
 * present 的三条来源：forceMount（消费者接管）、keepMounted（打开过一次之后常驻）、
 * 以及开合本身（首次打开之前的懒挂载）。开合状态在这里是唯一真源，所以判定放在本层，
 * 封装层不必再去同时盯 prop 和 update 事件。
 */
const retention = useKeepMounted({ open: menu.isOpen, enabled: () => props.keepMounted });

const presence = usePresence({
  present: () => props.forceMount || retention.keepMounted.value || menu.isOpen.value,
});

const contentProps = computed(() => menu.getContentProps());

const side = computed(() => parsePlacement(menu.floating.placement.value).side);

function setContentElement(node: unknown): void {
  presence.setElement(node);
  menu.setContentElement(node);
}
</script>

<template>
  <Teleport :to="props.container">
    <div
      v-if="presence.isPresent.value"
      :ref="setContentElement"
      v-bind="{ ...contentProps, ...$attrs }"
      :style="menu.floating.floatingStyle.value"
      :data-side="side"
      data-part="content"
      @keydown="menu.onContentKeydown"
    >
      <slot />
    </div>
  </Teleport>
</template>
