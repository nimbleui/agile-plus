<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';

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

// 元素入口在挂载后补登记：键盘导航直接 focus 这个元素，不做全局 id 查询。
const triggerElement = ref<HTMLButtonElement | null>(null);

// onMounted 在 app.mount 内同步执行：键盘事件可能在挂载后的第一帧之前就到达，
// 用 watch 补登记会晚一步，焦点就落不到目标按钮上。
onMounted(() => {
  if (triggerElement.value) tabs.registerTab(props.value, triggerElement.value);
});

onBeforeUnmount(() => {
  tabs.unregisterTab(props.value);
});

const triggerProps = computed(() => tabs.getTriggerProps(props.value));
</script>

<template>
  <button
    ref="triggerElement"
    type="button"
    v-bind="triggerProps"
    data-part="trigger"
    @click="tabs.setActive(props.value)"
    @keydown="tabs.onTriggerKeydown"
  >
    <slot />
  </button>
</template>
