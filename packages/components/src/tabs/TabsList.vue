<script setup lang="ts">
import { TabsList as UiTabsList } from '@agile-plus/ui/tabs';

/**
 * 带样式的标签列表。
 *
 * 注入 `.y-tabs[data-part='list']` 所需的 class，样式定义在 `Tabs.scss`；
 * 无头层继续负责 role 与 aria-orientation，不在这里重复。
 */
defineSlots<{
  default(): unknown;
}>();
</script>

<template>
  <UiTabsList class="y-tabs" data-part="list">
    <slot />
  </UiTabsList>
</template>

<style lang="scss">
@use './Tabs.scss';
</style>
