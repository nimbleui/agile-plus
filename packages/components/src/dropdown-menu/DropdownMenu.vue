<script setup lang="ts">
import { computed } from 'vue';

import {
  DropdownMenuContent,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from '@agile-plus/ui/dropdown-menu';

import type { PropType } from 'vue';

import type { FloatingOffset, FloatingPlacement, FloatingStrategy } from '@agile-plus/ui';

/**
 * 带样式的 DropdownMenu。触发元素外观交给消费者（trigger 插槽），本层给菜单面板与
 * 项注入样式。浮层**首次打开才挂载、打开过一次之后常驻**（`keepMounted` 默认为真）：
 * 关闭只切成 `data-state="closed"`，菜单里的滚动位置与临时状态留得住，重开也不必重建 DOM。
 * 要回到「关闭即卸载」就把 `keepMounted` 关掉。
 */
const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  onSelect: { type: Function as PropType<(id: string) => void>, default: undefined },
  placement: { type: String as PropType<FloatingPlacement>, default: undefined },
  offset: { type: [Number, Object] as PropType<number | FloatingOffset>, default: undefined },
  flip: { type: Boolean, default: undefined },
  shift: { type: Boolean, default: undefined },
  padding: { type: Number, default: undefined },
  strategy: { type: String as PropType<FloatingStrategy>, default: undefined },
  loop: { type: Boolean, default: true },
  container: { type: [String, Object] as PropType<string | HTMLElement>, default: 'body' },
  /** 缺省常驻，理由见组件注释；无头层判定在 useKeepMounted，本层只做透传。 */
  keepMounted: { type: Boolean, default: true },
  triggerAsChild: { type: Boolean, default: false },
});

const emit = defineEmits<{
  'update:open': [value: boolean];
  'item-select': [id: string];
}>();

defineSlots<{
  trigger(): unknown;
  default(): unknown;
}>();

/**
 * 只把属于 Root 的属性交下去。
 *
 * `container` 与 `keepMounted` 归 Content、`triggerAsChild` 归 Trigger，都是本层自己的
 * 编排参数，Root 没声明它们。整包 `v-bind="props"` 会把这些键变成落在 Root 上的透传属性，
 * 而 Root 只有 slot 没有元素根，dev 下就报 Extraneous non-props attributes。
 */
const rootProps = computed(() => ({
  open: props.open,
  defaultOpen: props.defaultOpen,
  onSelect: props.onSelect,
  placement: props.placement,
  offset: props.offset,
  flip: props.flip,
  shift: props.shift,
  padding: props.padding,
  strategy: props.strategy,
  loop: props.loop,
}));
</script>

<template>
  <DropdownMenuRoot
    v-bind="rootProps"
    @update:open="(v) => emit('update:open', v)"
    @item-select="(id) => emit('item-select', id)"
  >
    <DropdownMenuTrigger :as-child="props.triggerAsChild">
      <slot name="trigger" />
    </DropdownMenuTrigger>

    <DropdownMenuContent
      class="y-dropdown-menu"
      :container="props.container"
      :keep-mounted="props.keepMounted"
    >
      <slot />
    </DropdownMenuContent>
  </DropdownMenuRoot>
</template>

<style lang="scss">
@use './DropdownMenu.scss';
</style>
