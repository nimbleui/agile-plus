<script setup lang="ts">
import { useAvatarImage } from '@agile-plus/headless';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { AvatarImageProps } from './types';

/**
 * 头像图片。
 *
 * 加载生命周期由 useAvatarImage 桥接成状态上报给 Root。加载失败时不渲染 img，
 * 避免浏览器画出破碎图标——此时由 Fallback 补位。
 */
const props = withDefaults(defineProps<AvatarImageProps>(), {
  src: undefined,
  alt: undefined,
  as: 'img',
  asChild: false,
});

const avatar = useComponentContext('avatar');

const image = useAvatarImage({
  src: () => props.src,
  alt: () => props.alt,
  onStatusChange: avatar.setImageStatus,
});
</script>

<template>
  <Slot
    v-if="avatar.imageStatus.value !== 'error'"
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="image.setImageElement"
    v-bind="image.getImageAttrs()"
    data-part="image"
    @load="image.onLoad"
    @error="image.onError"
  />
</template>