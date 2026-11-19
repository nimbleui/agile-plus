<script setup lang="ts">
import { useAvatarFallback } from '@agile-plus/headless';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { AvatarFallbackProps } from './types';

/**
 * 头像补位内容。
 *
 * 是否渲染由 useAvatarFallback 按加载状态与延迟策略决定：图片就绪则退场，
 * 失败或延迟到点则补位。内容（文字缩写、图标等）完全交给消费者插槽。
 */
const props = withDefaults(defineProps<AvatarFallbackProps>(), {
  delayMs: 0,
  as: 'span',
  asChild: false,
});

const avatar = useComponentContext('avatar');

const fallback = useAvatarFallback({
  status: () => avatar.imageStatus.value,
  delayMs: () => props.delayMs,
});
</script>

<template>
  <Slot
    v-if="fallback.canRender.value"
    :as="props.as"
    :as-child="props.asChild"
    data-part="fallback"
  >
    <slot />
  </Slot>
</template>