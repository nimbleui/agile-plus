<script setup lang="ts">
import { computed } from 'vue';

import { PopoverContent, PopoverRoot, PopoverTrigger } from '@agile-plus/ui/popover';

import type { PropType } from 'vue';

import type { FloatingOffset, FloatingPlacement, FloatingStrategy } from '@agile-plus/ui';

/**
 * 带样式的 Popover。
 *
 * 触发元素外观交给消费者（trigger 插槽），本层只给浮层面板注入样式。浮层**首次打开
 * 才挂载、打开过一次之后常驻**（`keepMounted` 默认为真）：关闭只切成
 * `data-state="closed"`，浮层里的滚动位置与临时状态留得住，重开也不必重建 DOM。
 * 要回到「关闭即卸载」就把 `keepMounted` 关掉。
 *
 * 布尔属性运行时声明并显式 default: undefined，避免非受控开合被 cast 成 false 锁死、
 * flip / shift 覆盖无头层默认值。
 */
const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  placement: { type: String as PropType<FloatingPlacement>, default: undefined },
  offset: { type: [Number, Object] as PropType<number | FloatingOffset>, default: undefined },
  flip: { type: Boolean, default: undefined },
  shift: { type: Boolean, default: undefined },
  padding: { type: Number, default: undefined },
  strategy: { type: String as PropType<FloatingStrategy>, default: undefined },
  container: { type: [String, Object] as PropType<string | HTMLElement>, default: 'body' },
  /** 缺省常驻，理由见组件注释；无头层判定在 useKeepMounted，本层只做透传。 */
  keepMounted: { type: Boolean, default: true },
  triggerAsChild: { type: Boolean, default: false },
});

const emit = defineEmits<{ 'update:open': [value: boolean] }>();

defineSlots<{
  /** 触发元素内容（本层已渲染 button，不要再嵌套 button） */
  trigger(): unknown;
  /** 浮层正文 */
  default(): unknown;
}>();

/**
 * 只把属于 Root 的属性交下去。
 *
 * `container` 与 `keepMounted` 归 Content、`triggerAsChild` 归 Trigger 的 asChild，都是
 * 本层自己的编排参数，Root 没声明它们；整包 `v-bind="props"` 会让它们在只有一个 slot
 * 根的 Root 上变成无处落地的透传属性，dev 下报 Extraneous non-props attributes。
 */
const rootProps = computed(() => ({
  open: props.open,
  defaultOpen: props.defaultOpen,
  placement: props.placement,
  offset: props.offset,
  flip: props.flip,
  shift: props.shift,
  padding: props.padding,
  strategy: props.strategy,
}));
</script>

<template>
  <PopoverRoot v-bind="rootProps" @update:open="(v) => emit('update:open', v)">
    <PopoverTrigger :as-child="props.triggerAsChild">
      <slot name="trigger" />
    </PopoverTrigger>

    <PopoverContent
      class="y-popover"
      :container="props.container"
      :keep-mounted="props.keepMounted"
    >
      <slot />
    </PopoverContent>
  </PopoverRoot>
</template>

<style lang="scss">
@use './Popover.scss';
</style>
