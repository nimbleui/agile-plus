<script setup lang="ts">
import { computed, inject, onBeforeUnmount } from 'vue';

import type { UseTabsReturn } from '@agile-plus/headless';

/**
 * Tabs 触发器组件。
 *
 * 渲染为 role="tab" 按钮，自动绑定 aria-selected、aria-controls、
 * roving tabindex 和键盘导航事件。消费者通过 value prop 标识所属 tab。
 */
const props = defineProps<{
  /** 该 tab 的唯一 value 标识，必须与对应 TabsContent 的 value 一致 */
  value: string;
}>();

const tabs = inject<UseTabsReturn>('tabs');

if (!tabs) {
  throw new Error('TabsTrigger must be used within TabsRoot');
}

// 注册必须在 setup 执行而非属性函数内，保证 computed 求值不产生副作用。
tabs.registerTab(props.value);

onBeforeUnmount(() => {
  tabs.unregisterTab(props.value);
});

const triggerProps = computed(() => tabs.getTriggerProps(props.value));
</script>

<template>
  <button
    type="button"
    v-bind="triggerProps"
    @click="tabs.setActive(props.value)"
    @keydown="tabs.onTriggerKeydown"
  >
    <slot />
  </button>
</template>
