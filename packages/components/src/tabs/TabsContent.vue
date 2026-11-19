<script setup lang="ts">
import { TabsContent as UiTabsContent } from '@agile-plus/ui/tabs';

/**
 * 带样式的标签面板。
 *
 * 注入 `.y-tabs[data-part='content']` 所需的 class；面板隐藏继续由无头层的
 * `hidden` 属性控制，这里不写额外状态 class。
 */
defineProps<{
  /** 与对应标签按钮一致的唯一 value */
  value: string;
}>();

defineSlots<{
  default(): unknown;
}>();
</script>

<template>
  <UiTabsContent :value="value" class="y-tabs" data-part="content">
    <slot />
  </UiTabsContent>
</template>

<style lang="scss">
@use './Tabs.scss';
</style>
