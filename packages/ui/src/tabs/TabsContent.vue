<script setup lang="ts">
import { computed, inject } from 'vue';

import type { UseTabsReturn } from '@agile-plus/headless';

/**
 * Tabs 内容面板组件。
 *
 * 渲染为 role="tabpanel" 容器，自动绑定 aria-labelledby 和 hidden 属性。
 * 仅在对应 tab 激活时可见。消费者通过 value prop 标识所属 tab。
 */
const props = defineProps<{
  /** 该面板的唯一 value 标识，必须与对应 TabsTrigger 的 value 一致 */
  value: string;
}>();

const tabs = inject<UseTabsReturn>('tabs');

if (!tabs) {
  throw new Error('TabsContent must be used within TabsRoot');
}

const contentProps = computed(() => tabs.getContentProps(props.value));
</script>

<template>
  <div v-bind="contentProps" data-part="content">
    <slot />
  </div>
</template>
