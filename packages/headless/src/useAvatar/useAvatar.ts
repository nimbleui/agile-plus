import { ref } from 'vue';

import { getAvatarRootAttrs } from '@agile-plus/primitives/avatar';

import type { AvatarImageStatus } from '@agile-plus/primitives/avatar';

import type { UseAvatarOptions, UseAvatarReturn } from './types';

/**
 * Avatar Root：持有图片加载状态这一份真源。
 *
 * Image 通过 setImageStatus 上报，Fallback 读 imageStatus 决定补位，Root 自己不发起
 * 加载——加载由渲染出的 img 的 load / error 事件驱动，避免再开一个 window.Image 预加载
 * 造成重复请求。
 *
 * @param options 状态变化回调。
 * @returns 加载状态、写入口与根属性表。
 */
export function useAvatar(options: UseAvatarOptions = {}): UseAvatarReturn {
  const imageStatus = ref<AvatarImageStatus>('idle');

  function setImageStatus(status: AvatarImageStatus): void {
    if (imageStatus.value === status) return;

    imageStatus.value = status;

    options.onLoadingStatusChange?.(status);
  }

  function getRootAttrs(): Record<string, unknown> {
    return getAvatarRootAttrs({ status: imageStatus.value });
  }

  return {
    imageStatus,
    setImageStatus,
    getRootAttrs,
  };
}