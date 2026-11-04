<script setup lang="ts">
import { TabsRoot } from '@agile-plus/ui/tabs';

import type { TabsRootEmits, TabsRootProps } from '@agile-plus/ui';

/**
 * 带样式的 Tabs 组件。
 *
 * 封装 UI 层的复合组件并注入样式，提供开箱即用的标签页体验。
 * 支持 v-model 双向绑定激活值。
 *
 * @example
 * ```vue
 * <Tabs v-model="activeTab">
 *   <Tabs.List>
 *     <Tabs.Trigger value="tab1">概览</Tabs.Trigger>
 *     <Tabs.Trigger value="tab2">详情</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="tab1">概览内容</Tabs.Content>
 *   <Tabs.Content value="tab2">详情内容</Tabs.Content>
 * </Tabs>
 * ```
 */
// 与 Dialog 一致：显式声明默认值，避免 $props 透传时下游默认值被 undefined 覆盖。
withDefaults(defineProps<TabsRootProps>(), {
  defaultValue: '',
  activationMode: 'automatic',
  orientation: 'horizontal',
});

const emit = defineEmits<TabsRootEmits>();

defineSlots<{
  default(): unknown;
}>();
</script>

<template>
  <TabsRoot v-bind="$props" @update:model-value="(v) => emit('update:modelValue', v)">
    <slot />
  </TabsRoot>
</template>

<style lang="scss">
@use './Tabs.scss';
</style>
