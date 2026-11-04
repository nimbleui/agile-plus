import { computed, onScopeDispose, ref, toValue, watch } from 'vue';

import { isPresencePresent, sendPresenceEvent } from '@agile-plus/primitives/presence';

import type { PresenceEvent, PresenceState } from '@agile-plus/primitives/presence';

import type { UsePresenceOptions, UsePresenceReturn } from './types';

/**
 * Presence：把「应当存在」翻译成「是否留在 DOM 中」。
 *
 * 状态、事件与转移表都在 primitives/presence，本 composable 只负责两件事：判断
 * 「此刻有没有退出动画在跑」，以及把动画事件桥接回状态机。
 *
 * 判定依赖 `animationstart` / `animationend` / `animationcancel` 与 `animation-name`
 * 的变化，这一点与 Radix 一致。**因此本库组件的进出场必须写成 @keyframes 动画**：
 * transition 被打断时没有对应事件，用它做退出动画会把元素永久留在 DOM 里。
 *
 * @param options Presence 配置。
 * @returns 渲染开关与元素绑定入口。
 */
export function usePresence(options: UsePresenceOptions): UsePresenceReturn {
  const state = ref<PresenceState>(toValue(options.present) ? 'mounted' : 'unmounted');
  const element = ref<HTMLElement | null>(null);
  const isPresent = computed(() => isPresencePresent(state.value));

  let previousAnimationName = 'none';

  let fillModeTimer = 0;

  /**
   * 即时读取计算样式。
   *
   * Radix 缓存 getComputedStyle 的返回对象，但那是为了绕开 React 兄弟副作用污染
   * body 样式后强制重算的问题；这里只在 present 变化与动画结束时读取，两个时机都
   * 是低频，直接读取更可靠：缓存对象在 jsdom 下不会随内联样式更新，会让退出动画的
   * 判定无法在单元测试里覆盖。
   */
  function readStyles(): CSSStyleDeclaration | null {
    if (!element.value) return null;

    return element.value.ownerDocument.defaultView?.getComputedStyle(element.value) ?? null;
  }

  function readAnimationName(): string {
    return readStyles()?.animationName || 'none';
  }

  /**
   * 推进状态机并同步动画名基线。
   *
   * 进入 mounted 时把基线设为当前动画名，退出时才能比对出差异；其它状态重置为
   * 'none'，与 Radix 在 passive effect 里的处理一致。
   */
  function send(event: PresenceEvent): void {
    const next = sendPresenceEvent(state.value, event);

    if (next === state.value) return;

    state.value = next;
    previousAnimationName = next === 'mounted' ? readAnimationName() : 'none';
  }

  function handleAnimationStart(event: AnimationEvent): void {
    if (event.target !== element.value) return;

    previousAnimationName = readAnimationName();
  }

  function handleAnimationFinished(event: AnimationEvent): void {
    const node = element.value;

    if (!node || event.target !== node) return;

    const currentAnimationName = readAnimationName();

    // 只认当前生效的动画：进入动画被打断同样派发 animationcancel，
    // 那时不能把挂起中的退出当成结束。
    if (!currentAnimationName.includes(event.animationName)) return;

    send('ANIMATION_END');

    if (toValue(options.present)) return;

    /**
     * 动画结束到节点移除之间仍有一帧可见内容，会闪一下。
     *
     * 把 fill-mode 强制成 forwards 让节点保持最后一个关键帧的样式，之后再还原
     * （有些消费者会保留元素）。时机必须是 setTimeout 而不是 rAF——rAF 仍在同一帧
     * 内，闪屏照旧，这是 Radix 注释里明确写过的坑。
     */
    const previousFillMode = node.style.animationFillMode;

    node.style.animationFillMode = 'forwards';

    fillModeTimer = window.setTimeout(() => {
      if (node.style.animationFillMode === 'forwards') {
        node.style.animationFillMode = previousFillMode;
      }
    });
  }

  function setElement(node: unknown): void {
    element.value = node instanceof HTMLElement ? node : null;
  }

  watch(element, (node, previousNode) => {
    window.clearTimeout(fillModeTimer);

    previousNode?.removeEventListener('animationstart', handleAnimationStart);
    previousNode?.removeEventListener('animationcancel', handleAnimationFinished);
    previousNode?.removeEventListener('animationend', handleAnimationFinished);

    if (!node) {
      // 节点被外部提前移除（父级 v-if 变化等），不会有动画事件回来，
      // 直接按结束处理，避免卡在 unmountSuspended。
      send('ANIMATION_END');

      return;
    }

    if (state.value === 'mounted') previousAnimationName = readAnimationName();

    node.addEventListener('animationstart', handleAnimationStart);
    node.addEventListener('animationcancel', handleAnimationFinished);
    node.addEventListener('animationend', handleAnimationFinished);
  });

  // flush: 'post' 让回调在 DOM 补丁之后执行，此时 data-state 已经落到元素上，
  // 读到的 animation-name 才反映退出动画是否真的开始。
  watch(
    () => toValue(options.present),
    (present, wasPresent) => {
      if (present) {
        send('MOUNT');

        return;
      }

      const currentAnimationName = readAnimationName();
      const hasExitAnimation = currentAnimationName !== 'none' && readStyles()?.display !== 'none';
      const isAnimating = previousAnimationName !== currentAnimationName;

      if (!wasPresent || !hasExitAnimation || !isAnimating) {
        send('UNMOUNT');

        return;
      }

      send('ANIMATION_OUT');
    },
    { flush: 'post', immediate: true }
  );

  onScopeDispose(() => {
    window.clearTimeout(fillModeTimer);

    const node = element.value;

    if (!node) return;

    node.removeEventListener('animationstart', handleAnimationStart);
    node.removeEventListener('animationcancel', handleAnimationFinished);
    node.removeEventListener('animationend', handleAnimationFinished);
  });

  return { isPresent, element, setElement };
}
