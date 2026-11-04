import { computed, onMounted, onScopeDispose, ref, toValue, useId, watch } from 'vue';

import {
  TOAST_ANNOUNCE_LIFETIME,
  VISUALLY_HIDDEN_STYLE,
  createToastTimerSnapshot,
  getSwipeEndPhase,
  getToastAnnounceTextContent,
  isToastTimerDisabled,
  pauseToastTimer,
  resolveSwipeMove,
  resumeToastTimer,
} from '@agile-plus/primitives/toast';

import { usePresence } from '../usePresence';
import { isBrowser } from '../utils/env';
import { useControllable } from '../utils/useControllable';

import type { ToastPoint, ToastSwipePhase } from '@agile-plus/primitives/toast';

import type { ToastSwipeDetail, UseToastOptions, UseToastReturn } from './types';

/**
 * 手势位移对应的 CSS 变量名。
 *
 * Radix 用 `--radix-toast-*` 厂商前缀；本库统一走 `--y-` 命名空间，与 Design Token
 * 同一套前缀规则，样式层只认这一组名字。
 */
const SWIPE_VARS = {
  moveX: '--y-toast-swipe-move-x',
  moveY: '--y-toast-swipe-move-y',
  endX: '--y-toast-swipe-end-x',
  endY: '--y-toast-swipe-end-y',
} as const;

/**
 * useToast 的单条通知逻辑。
 *
 * 三块状态各自独立，共同点只有「都挂在这条通知上」，分开写比塞进一个状态机更好读：
 *
 * 1. **计时**。时长可被 Provider 或本条覆盖，`Infinity`/0/NaN 表示常驻。暂停时扣减
 *    已消耗时间、恢复时按剩余时间重开，所以计时快照与 setTimeout 句柄必须成对维护。
 * 2. **手势**。位移钳制、启动阈值、方向判定与关闭阈值全部委托 primitives，这里只做
 *    「事件 → 状态」的桥接；指针捕获挂在命中元素上，手指移出通知也能继续拖。
 * 3. **announcer**。通知本体是 portal 进视口的，读屏需要一个独立的 `role="status"`
 *    区域；文本要等下一帧才写入（否则 NVDA 读不到），并在存活期结束后移除，让同一条
 *    通知再次出现时还能重新播报。
 *
 * @param options 通知配置，必须带上 Provider 上下文。
 * @returns 渲染与交互所需的响应式状态、属性与处理器。
 */
export function useToast(options: UseToastOptions): UseToastReturn {
  const { provider } = options;
  const id = useId();

  const state = useControllable<boolean>({
    value: () => toValue(options.open),
    defaultValue: options.defaultOpen ?? true,
    onChange: (value) => options.onOpenChange?.(value),
  });

  const isOpen = state.value;

  const duration = computed(() => toValue(options.duration) ?? provider.duration.value);

  const presence = usePresence({
    present: () => Boolean(toValue(options.forceMount)) || isOpen.value,
  });

  const swipePhase = ref<ToastSwipePhase | null>(null);
  const swipeMove = ref<ToastPoint | null>(null);
  const swipeEnd = ref<ToastPoint | null>(null);

  let pointerStart: ToastPoint | null = null;
  let gestureDelta: ToastPoint | null = null;

  let timerId = 0;
  let snapshot = createToastTimerSnapshot(duration.value, isBrowser ? Date.now() : 0);

  function setOpen(value: boolean): void {
    state.set(value);
  }

  function close(): void {
    setOpen(false);
  }

  /**
   * 到时关闭：先把焦点交还视口。
   *
   * 通知消失时如果焦点还在它内部，浏览器会把焦点退回 body，读屏用户等于被扔出
   * 当前位置；视口可聚焦，且它是列表，能播报剩余条数。
   */
  function handleClose(): void {
    const isFocusInside = presence.element.value?.contains(document.activeElement);

    if (isFocusInside) provider.viewport.value?.focus();

    close();
  }

  /**
   * 启动（或重启）一段计时。
   *
   * 快照与句柄必须一起更新：暂停时要从快照扣时间，而重入时旧的 setTimeout 已经无效。
   */
  function startTimer(delay: number): void {
    if (isToastTimerDisabled(delay)) return;

    window.clearTimeout(timerId);
    snapshot = createToastTimerSnapshot(delay, Date.now());
    timerId = window.setTimeout(handleClose, delay);
  }

  function pauseTimer(): void {
    snapshot = pauseToastTimer(snapshot, Date.now());
    window.clearTimeout(timerId);
    options.onPause?.();
  }

  function resumeTimer(): void {
    snapshot = resumeToastTimer(snapshot, Date.now());
    startTimer(snapshot.remaining);
    options.onResume?.();
  }

  // 正在关闭的通知不再响应暂停/恢复：动画期间重设计时只会留下一个无意义的定时器。
  const unsubscribeClosing = provider.subscribeClosing((paused) => {
    if (!isOpen.value) return;

    if (paused) pauseTimer();
    else resumeTimer();
  });

  watch(
    [isOpen, duration],
    ([open, nextDuration]) => {
      // 每次 open/duration 变化都重置剩余时间：常驻加载通知改成有限时长后，
      // 若沿用 Infinity 的剩余值就永远不会关闭（Radix issue #2233）。
      snapshot = createToastTimerSnapshot(nextDuration, Date.now());

      if (!isBrowser) return;

      if (open && !provider.isClosePaused.value) startTimer(nextDuration);
      else window.clearTimeout(timerId);
    },
    { immediate: true }
  );

  // 只在真正挂载进 DOM 时计入通知数量：声明式用法里组件常驻，靠 open 判定会虚高，
  // 而视口要据此决定 pointer-events、焦点代理与 window 监听。
  let unregister: (() => void) | null = null;

  watch(
    presence.isPresent,
    (present) => {
      if (present) unregister = provider.registerToast({ id, element: presence.element, close });
      else {
        unregister?.();
        unregister = null;
      }
    },
    { immediate: true }
  );

  /* -------------------------------------------------------------------------
   * announcer
   * ------------------------------------------------------------------------- */

  const announcePhase = ref<'pending' | 'ready' | 'expired'>('pending');

  let nextFrameId = 0;
  let lifetimeId = 0;

  onMounted(() => {
    if (!isBrowser) return;

    /**
     * 连续两帧后才写入文本。
     *
     * 单帧不够：第一帧节点刚插入，读屏引擎还没把它登记进 live region，此时写文本会被
     * 当成初始内容忽略。Radix 的 useNextFrame 也是两帧。
     */
    nextFrameId = window.requestAnimationFrame(() => {
      nextFrameId = window.requestAnimationFrame(() => {
        announcePhase.value = 'ready';

        lifetimeId = window.setTimeout(() => {
          announcePhase.value = 'expired';
        }, TOAST_ANNOUNCE_LIFETIME);
      });
    });
  });

  const announceText = computed(() => {
    if (announcePhase.value !== 'ready' || !presence.element.value) return null;

    return getToastAnnounceTextContent(presence.element.value);
  });

  const ariaLive = computed(() =>
    (toValue(options.type) ?? 'foreground') === 'foreground' ? 'assertive' : 'polite'
  );

  /* -------------------------------------------------------------------------
   * 手势
   * ------------------------------------------------------------------------- */

  function emitSwipe(phase: ToastSwipePhase, detail: ToastSwipeDetail): void {
    swipePhase.value = phase;

    if (phase === 'start') {
      options.onSwipeStart?.(detail);

      return;
    }

    if (phase === 'move') options.onSwipeMove?.(detail);
    if (phase === 'cancel') options.onSwipeCancel?.(detail);
    if (phase === 'end') options.onSwipeEnd?.(detail);
  }

  function onRootKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;

    options.onEscapeKeyDown?.(event);

    if (!event.defaultPrevented) close();
  }

  function onRootPointerdown(event: PointerEvent): void {
    // 只响应主按钮：中键/右键按下时的移动不该被当成滑动手势。
    if (event.button !== 0) return;

    pointerStart = { x: event.clientX, y: event.clientY };
  }

  function onRootPointermove(event: PointerEvent): void {
    if (!pointerStart) return;

    const result = resolveSwipeMove({
      delta: { x: event.clientX - pointerStart.x, y: event.clientY - pointerStart.y },
      direction: provider.swipeDirection.value,
      pointerType: event.pointerType,
      started: gestureDelta !== null,
    });

    if (result.phase === 'idle') return;

    if (result.phase === 'reset') {
      pointerStart = null;

      return;
    }

    const detail: ToastSwipeDetail = { originalEvent: event, delta: result.clamped };

    gestureDelta = result.clamped;

    if (result.phase === 'start') {
      emitSwipe('start', detail);

      // 捕获挂在命中元素而不是通知本体：从按钮上起手的滑动也要能继续拖动。
      if (event.target instanceof HTMLElement) event.target.setPointerCapture(event.pointerId);

      return;
    }

    // move 阶段才写位移变量：start 那一帧还分不清是滑动还是点击，先不动。
    swipeMove.value = result.clamped;
    emitSwipe('move', detail);
  }

  function onRootPointerup(event: PointerEvent): void {
    const delta = gestureDelta;
    const target = event.target instanceof HTMLElement ? event.target : null;

    if (target?.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);

    gestureDelta = null;
    pointerStart = null;

    if (!delta) return;

    const detail: ToastSwipeDetail = { originalEvent: event, delta };
    const phase = getSwipeEndPhase(
      delta,
      provider.swipeDirection.value,
      provider.swipeThreshold.value
    );

    if (phase === 'end') {
      // 位移交给 end 变量表达，move 变量必须清掉，否则样式里两者叠加。
      swipeMove.value = null;
      swipeEnd.value = delta;
      emitSwipe('end', detail);
      close();
    } else {
      swipeMove.value = null;
      swipeEnd.value = null;
      emitSwipe('cancel', detail);
    }

    /**
     * 抬手这一次 click 要被吞掉。
     *
     * 滑动结束的同时也会派发 click，不拦截的话「滑着通知去按里面的按钮」会误触按钮。
     */
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.addEventListener('click', (clickEvent) => clickEvent.preventDefault(), {
        once: true,
      });
    }
  }

  function getRootProps(): Record<string, unknown> {
    return {
      tabindex: 0,
      'data-state': isOpen.value ? 'open' : 'closed',
      'data-swipe-direction': provider.swipeDirection.value,
      ...(swipePhase.value ? { 'data-swipe': swipePhase.value } : {}),
      style: {
        // 内联而不是写在样式里：滑动手势必须生效，而不依赖消费者有没有引入样式表。
        userSelect: 'none',
        touchAction: 'none',
        ...(swipeMove.value ? { [SWIPE_VARS.moveX]: `${swipeMove.value.x}px` } : null),
        ...(swipeMove.value ? { [SWIPE_VARS.moveY]: `${swipeMove.value.y}px` } : null),
        ...(swipeEnd.value ? { [SWIPE_VARS.endX]: `${swipeEnd.value.x}px` } : null),
        ...(swipeEnd.value ? { [SWIPE_VARS.endY]: `${swipeEnd.value.y}px` } : null),
      },
    };
  }

  function getAnnounceProps(): Record<string, unknown> {
    return {
      // 永远用 status 而不是 alert：alert 在部分读屏里会造成逐字卡顿。
      role: 'status',
      'aria-live': ariaLive.value,
      style: VISUALLY_HIDDEN_STYLE,
    };
  }

  function bindElement(node: unknown): void {
    presence.setElement(node);
  }

  onScopeDispose(() => {
    unsubscribeClosing();
    unregister?.();

    if (!isBrowser) return;

    window.clearTimeout(timerId);
    window.clearTimeout(lifetimeId);

    if (nextFrameId) window.cancelAnimationFrame(nextFrameId);
  });

  return {
    isOpen,
    isPresent: presence.isPresent,
    element: presence.element,
    bindElement,
    close,
    swipePhase: computed(() => swipePhase.value),
    swipeDirection: provider.swipeDirection,
    getRootProps,
    isAnnounceVisible: computed(() => announcePhase.value !== 'expired'),
    announceText,
    announceLabel: provider.label,
    announceTarget: computed(() => provider.announceContainer.value ?? 'body'),
    getAnnounceProps,
    onRootKeydown,
    onRootPointerdown,
    onRootPointermove,
    onRootPointerup,
  };
}
