import { computed, onScopeDispose, ref, toValue, watch } from 'vue';

import { resolveAvatarFallback } from '@agile-plus/primitives/avatar';

import { isBrowser } from '../utils/env';

import type { UseAvatarFallbackOptions, UseAvatarFallbackReturn } from './types';

/**
 * Avatar Fallback：按延迟策略决定补位内容是否渲染。
 *
 * 可见性规则本身在 primitives/avatar（resolveAvatarFallback），这里只负责把「延迟到点」
 * 这个时间维度补上：状态或延迟变化时重置计时并按需重启，加载成功或失败时清掉计时器。
 * 计时器在 scope 销毁时清理，避免卸载后仍写状态。
 *
 * SSR 下不启动计时器（没有 window），delayElapsed 恒为 false，首屏按「未延迟到点」渲染。
 *
 * @param options 状态来源与延迟毫秒数。
 * @returns 此刻是否渲染 fallback。
 */
export function useAvatarFallback(options: UseAvatarFallbackOptions): UseAvatarFallbackReturn {
  const delayElapsed = ref(false);

  const status = computed(() => toValue(options.status));

  const delayMs = computed(() => toValue(options.delayMs) ?? 0);

  let timer = 0;

  watch(
    [status, delayMs],
    ([currentStatus, currentDelay]) => {
      if (!isBrowser) return;

      window.clearTimeout(timer);

      delayElapsed.value = false;

      // 已加载无需补位；失败立即补位；不延迟也立即补位——这三种都不必起计时器。
      if (currentStatus === 'loaded' || currentStatus === 'error' || currentDelay <= 0) return;

      timer = window.setTimeout(() => {
        delayElapsed.value = true;
      }, currentDelay);
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    if (isBrowser) window.clearTimeout(timer);
  });

  const canRender = computed(() =>
    resolveAvatarFallback({
      status: status.value,
      delayMs: delayMs.value,
      delayElapsed: delayElapsed.value,
    })
  );

  return { canRender };
}