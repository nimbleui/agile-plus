<script setup lang="ts">
import { provide } from 'vue';

import { useAvatar } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { AvatarRootEmits, AvatarRootProps } from './types';

/**
 * 头像根组件。
 *
 * 只持有图片加载状态这一份真源并下发给 Image / Fallback；data-status 随状态变化，
 * 供样式层与测试读取。加载状态变化通过 loading-status-change 事件向外通知。
 */
const props = withDefaults(defineProps<AvatarRootProps>(), {
  as: 'span',
  asChild: false,
});

const emit = defineEmits<AvatarRootEmits>();

const avatar = useAvatar({
  onLoadingStatusChange: (status) => emit('loading-status-change', status),
});

provide('avatar', avatar);
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="avatar.getRootAttrs()" data-part="root">
    <slot />
  </Slot>
</template>