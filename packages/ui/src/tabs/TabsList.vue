<script setup lang="ts">
import { inject } from 'vue';

import type { UseTabsReturn } from '@agile-plus/headless';

/**
 * Tabs 列表容器组件。
 *
 * 渲染为 role="tablist" 容器，包含所有 tab trigger。
 * 消费者通过默认插槽放置 TabsTrigger 子组件。
 */
const tabs = inject<UseTabsReturn>('tabs');

if (!tabs) {
  throw new Error('TabsList must be used within TabsRoot');
}

const tabListProps = tabs.getTabListProps();
</script>

<template>
  <div v-bind="tabListProps" data-part="list">
    <slot />
  </div>
</template>
