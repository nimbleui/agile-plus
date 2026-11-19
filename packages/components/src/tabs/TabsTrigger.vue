<script setup lang="ts">
import { TabsTrigger as UiTabsTrigger } from '@agile-plus/ui/tabs';

/**
 * 带样式的标签按钮。
 *
 * `value` 由无头层消费，这里只负责把 BEM class 落到 role="tab" 的按钮上；
 * 激活态仍由 `aria-selected` 驱动，不额外维护一份 class 状态。
 */
defineProps<{
  /** 与对应面板一致的唯一 value */
  value: string;
}>();

defineSlots<{
  default(): unknown;
}>();
</script>

<template>
  <UiTabsTrigger :value="value" class="y-tabs__trigger" data-part="trigger">
    <slot />
  </UiTabsTrigger>
</template>

<style lang="scss">
@use './Tabs.scss';
</style>
