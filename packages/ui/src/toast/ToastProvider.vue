<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useToastProvider } from '@agile-plus/headless';

import type { ToastProviderProps } from './types';

/**
 * Toast 的上下文提供者。
 *
 * 不渲染 DOM。通知是 portal 进视口的，Provider 必须活在两者之上：它持有配置、
 * portal 目标、正在挂载的通知集合，以及「自动关闭是否暂停」这条共享状态。
 */
const props = withDefaults(defineProps<ToastProviderProps>(), {
  label: 'Notification',
  duration: 5000,
  swipeDirection: 'right',
  swipeThreshold: 50,
});

const provider = useToastProvider({
  label: toRef(() => props.label),
  duration: toRef(() => props.duration),
  swipeDirection: toRef(() => props.swipeDirection),
  swipeThreshold: toRef(() => props.swipeThreshold),
  announceContainer: toRef(() => props.announceContainer),
});

provide('toastProvider', provider);
</script>

<template>
  <slot />
</template>
