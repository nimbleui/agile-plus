<script setup lang="ts">
import { computed } from 'vue';

import {
  AvatarFallback,
  AvatarImage,
  AvatarRoot,
  getAvatarInitials,
} from '@agile-plus/ui/avatar';

import type { PropType } from 'vue';

import type { AvatarRootEmits } from '@agile-plus/ui';

/**
 * 带风格的头像，预置 Image + Fallback 两段结构。
 *
 * size / shape 是纯视觉变体，换成修饰符类而不透传给无头层。fallback 内容优先用默认
 * 插槽；没给插槽时按 name 自动生成文字缩写（getAvatarInitials 经 ui 层转发）。图片
 * 加载失败或延迟到点时由无头层决定补位，本层只负责视觉。
 */
const props = defineProps({
  src: { type: String, default: undefined },
  alt: { type: String, default: undefined },
  name: { type: String, default: undefined },
  size: { type: String as PropType<'small' | 'middle' | 'large'>, default: 'middle' },
  shape: { type: String as PropType<'circle' | 'square'>, default: 'circle' },
  delayMs: { type: Number, default: 0 },
});

const emit = defineEmits<AvatarRootEmits>();

const initials = computed(() => (props.name ? getAvatarInitials(props.name) : ''));

const rootClass = computed(() => ['y-avatar', `y-avatar--${props.size}`, `y-avatar--${props.shape}`]);
</script>

<template>
  <AvatarRoot
    :class="rootClass"
    @loading-status-change="(status) => emit('loading-status-change', status)"
  >
    <AvatarImage :src="props.src" :alt="props.alt" class="y-avatar__image" />

    <AvatarFallback :delay-ms="props.delayMs" class="y-avatar__fallback">
      <slot>{{ initials }}</slot>
    </AvatarFallback>
  </AvatarRoot>
</template>

<style lang="scss">
@use './Avatar.scss';
</style>