<script setup lang="ts">
import { ToggleGroupItem as UiToggleGroupItem } from '@agile-plus/ui/toggle';

/**
 * 带样式的组内项。
 *
 * 它必须放在 `ToggleGroup` 内：状态来源是组的值，项上写 `pressed` 没有意义
 * （无头层的 `ToggleGroupItem` 同样不接收该属性）。
 */
const props = defineProps({
  value: { type: String, required: true },
  disabled: { type: Boolean, default: false },
  as: { type: String, default: 'button' },
  asChild: { type: Boolean, default: false },
});
</script>

<template>
  <UiToggleGroupItem v-bind="props" class="y-toggle-group__item">
    <slot />
  </UiToggleGroupItem>
</template>

<style lang="scss">
@use './Toggle.scss';
</style>
