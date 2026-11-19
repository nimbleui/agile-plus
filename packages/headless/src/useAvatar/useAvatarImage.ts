import { computed, ref, toValue, watch } from 'vue';

import { getAvatarImageAttrs } from '@agile-plus/primitives/avatar';

import { isBrowser } from '../utils/env';

import type { UseAvatarImageOptions, UseAvatarImageReturn } from './types';

/**
 * Avatar Image：把渲染出的 img 的加载生命周期桥接成状态上报。
 *
 * 不另开 window.Image 预加载——那会对同一地址发两次请求。状态来源只有三个：
 * src 变化（有地址进 loading、无地址回 idle）、img 的 load / error 事件、以及元素挂载
 * 时的 complete 兜底（缓存图片可能在监听挂上之前就已完成，load 事件会被错过）。
 *
 * **状态解析只在客户端 post 阶段做**：SSR 与注水首帧都停在 idle，图片在注水期间同步加载
 * 完成（data URI / 缓存）或立刻失败都不会改写首帧 DOM，避免 hydration mismatch；真正的
 * 状态在注水后的 post watch 里落定。jsdom 单测里 isBrowser 为真，同一套 watch 照常解析。
 *
 * @param options src / alt 与状态上报入口。
 * @returns img 属性表、load / error 处理器与元素入口。
 */
export function useAvatarImage(options: UseAvatarImageOptions): UseAvatarImageReturn {
  const element = ref<HTMLImageElement | null>(null);

  const src = computed(() => toValue(options.src));

  function setImageElement(node: unknown): void {
    element.value = node instanceof HTMLImageElement ? node : null;
  }

  function resolveFromElement(): void {
    if (!isBrowser) return;

    if (!src.value) {
      options.onStatusChange('idle');

      return;
    }

    const node = element.value;

    // img 未挂载或已被 error 态的 v-if 摘掉时不改状态：否则会在 loading↔error 之间
    // 抖动、反复重挂载并重复请求同一张坏图。
    if (!node) return;

    if (node.complete) {
      options.onStatusChange(node.naturalWidth > 0 ? 'loaded' : 'error');

      return;
    }

    options.onStatusChange('loading');
  }

  watch(element, resolveFromElement, { flush: 'post' });

  watch(src, resolveFromElement, { flush: 'post' });

  function onLoad(): void {
    options.onStatusChange('loaded');
  }

  function onError(): void {
    options.onStatusChange('error');
  }

  function getImageAttrs(): Record<string, unknown> {
    return getAvatarImageAttrs({ src: src.value, alt: toValue(options.alt) });
  }

  return {
    getImageAttrs,
    onLoad,
    onError,
    setImageElement,
  };
}