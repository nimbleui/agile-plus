<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useTabs } from '@agile-plus/headless';
import type { UseTabsReturn } from '@agile-plus/headless';

import type { TabsRootEmits, TabsRootProps } from './types';

/**
 * Tabs 根组件，作为复合组件的上下文提供者。
 *
 * 不渲染任何 DOM 元素，仅负责创建 Composable 实例并通过 provide/inject
 * 将 API 分发给子组件（List、Trigger、Content）。
 * 支持 v-model 双向绑定激活值。
 */
const props = withDefaults(defineProps<TabsRootProps>(), {
  defaultValue: '',
  activationMode: 'automatic',
  orientation: 'horizontal',
});

const emit = defineEmits<TabsRootEmits>();

// 以 getter 形式交给 Composable，保证外部 modelValue 变化能被持续读取。
const tabs = useTabs({
  ...props,
  modelValue: toRef(() => props.modelValue),
  onValueChange: (value) => emit('update:modelValue', value),
});

provide('tabs', tabs);

defineExpose({
  setActive: tabs.setActive,
  activeValue: tabs.activeValue,
} satisfies Partial<UseTabsReturn>);
</script>

<template>
  <slot />
</template>
