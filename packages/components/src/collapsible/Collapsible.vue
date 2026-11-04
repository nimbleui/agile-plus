<script setup lang="ts">
import {
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
} from '@agile-plus/ui/collapsible';

import type { CollapsibleRootEmits } from '@agile-plus/ui';

/**
 * 带样式的折叠区，预置 Radix 的三段结构：Root、Trigger、Content。
 *
 * 触发按钮的箭头是纯 CSS（`::after` 的两条边），旋转角度由 `data-state` 决定，
 * 因此不需要额外 DOM，也不需要 JS 参与状态切换。
 *
 * 进出场动画依赖无头层测量的 `--y-collapsible-content-height`：`@keyframes` 读不到
 * 「内容自然高度」，只能由测量写进来。减少动效偏好下动画整体关闭，退场回到即时卸载。
 *
 * `open` 显式给 undefined 默认值：Boolean prop 缺省会被 cast 成 false，
 * 而 useCollapsible 用 undefined 判定是否受控。
 */
const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits<CollapsibleRootEmits>();

defineSlots<{
  /** 触发按钮的内容 */
  trigger(): unknown;
  /** 折叠区主体 */
  default(): unknown;
}>();
</script>

<template>
  <CollapsibleRoot
    v-bind="props"
    class="y-collapsible"
    @update:open="(v) => emit('update:open', v)"
  >
    <CollapsibleTrigger class="y-collapsible__trigger">
      <slot name="trigger" />
    </CollapsibleTrigger>

    <CollapsibleContent class="y-collapsible__content">
      <slot />
    </CollapsibleContent>
  </CollapsibleRoot>
</template>

<style lang="scss">
@use './Collapsible.scss';
</style>
