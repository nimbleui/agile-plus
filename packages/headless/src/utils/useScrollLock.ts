import { onScopeDispose, toValue, watch } from 'vue';

import { isBrowser } from './env';

import type { MaybeRefOrGetter } from 'vue';

let lockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

/**
 * 读取滚动条占用的宽度。
 *
 * jsdom 不做布局，`documentElement.clientWidth` 为 0；此时如果直接相减会把整个视口
 * 当成滚动条，因此只在布局信息有效时计算。
 */
function getScrollbarWidth(): number {
  const documentWidth = document.documentElement.clientWidth;

  if (documentWidth <= 0) return 0;

  return Math.max(0, window.innerWidth - documentWidth);
}

/**
 * 获取滚动锁，返回释放函数。
 *
 * 用模块级计数支持多个消费者与嵌套对话框：只有最后一个持有者释放时才恢复原样式。
 */
function acquireScrollLock(): () => void {
  const body = document.body;

  if (lockCount === 0) {
    originalOverflow = body.style.overflow;
    originalPaddingRight = body.style.paddingRight;

    const scrollbarWidth = getScrollbarWidth();

    // 锁定滚动会让滚动条消失；补上等宽内边距，避免页面内容横向跳动。
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    body.style.overflow = 'hidden';
  }

  lockCount += 1;

  let released = false;

  return () => {
    if (released) return;

    released = true;
    lockCount = Math.max(0, lockCount - 1);

    if (lockCount > 0) return;

    body.style.overflow = originalOverflow;
    body.style.paddingRight = originalPaddingRight;
  };
}

/**
 * 锁定 `body` 滚动，支持多个消费者与嵌套对话框。
 *
 * @param active 是否持有滚动锁。
 */
export function useScrollLock(active: MaybeRefOrGetter<boolean>): void {
  if (!isBrowser) return;

  let release: (() => void) | null = null;

  watch(
    () => toValue(active),
    (isActive) => {
      if (isActive) {
        release ??= acquireScrollLock();

        return;
      }

      release?.();
      release = null;
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    release?.();
    release = null;
  });
}
