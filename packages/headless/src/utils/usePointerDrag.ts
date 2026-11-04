import { onScopeDispose } from 'vue';

import { isBrowser } from './env';

/**
 * 拖拽结束的原因。
 *
 * - `up`：指针正常抬起。
 * - `cancel`：系统中断（触摸被接管、指针丢失），或被新的拖拽与组件卸载强行结束。
 */
export type PointerDragEndReason = 'up' | 'cancel';

/**
 * 一次拖拽的回调。
 */
export interface UsePointerDragHandlers {
  /** 每次指针移动 */
  onMove(event: PointerEvent): void;

  /**
   * 拖拽结束。
   *
   * @param reason 结束原因；调用方据此决定是否提交（Slider 只在 `up` 时派发 commit）。
   */
  onEnd(reason: PointerDragEndReason): void;
}

/**
 * usePointerDrag 的返回值。
 */
export interface UsePointerDragReturn {
  /**
   * 开始一次拖拽。
   *
   * 已有进行中的拖拽会先以 `cancel` 结束：同一时刻只允许一次，否则两次按下会留下
   * 两套互相覆盖的监听器。
   *
   * @param handlers 拖拽回调。
   */
  start(handlers: UsePointerDragHandlers): void;

  /** 以 `cancel` 结束当前拖拽；没有拖拽时是空操作。 */
  stop(): void;
}

/**
 * 共享的指针拖拽接管。
 *
 * ScrollArea 的 thumb 与 Slider 的 thumb 需要同一套底座，且都刻意**不用**
 * `setPointerCapture`：它在合成指针事件下会抛 InvalidStateError。监听挂在 window 上
 * 同样能做到「指针移出控件后继续拖」，代价是必须自己保证释放——拖拽中途卸载或异常
 * 中断若漏掉清理，状态会永久停在 dragging（滚动条再也不会隐藏、Slider 会一直跟随指针）。
 * 把这段生命周期收口在这里，两个组件就不必各自维护一份 `disposeDragRef`。
 *
 * 只负责监听的登记与释放，不碰业务状态：坐标系、起点读数与提交语义都留在调用方。
 *
 * @returns 拖拽的启动与释放入口。
 */
export function usePointerDrag(): UsePointerDragReturn {
  /** 当前拖拽的收尾函数；null 表示没有进行中的拖拽。 */
  let current: ((reason: PointerDragEndReason) => void) | null = null;

  function start(handlers: UsePointerDragHandlers): void {
    if (!isBrowser) return;

    current?.('cancel');

    const onMove = (event: PointerEvent): void => {
      handlers.onMove(event);
    };

    const onUp = (): void => finish('up');

    const onCancel = (): void => finish('cancel');

    function finish(reason: PointerDragEndReason): void {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);

      // 被新拖拽顶替后，旧拖拽迟到的事件不该清掉新的收尾函数。
      if (current === finish) current = null;

      handlers.onEnd(reason);
    }

    current = finish;

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }

  function stop(): void {
    current?.('cancel');
  }

  onScopeDispose(stop);

  return { start, stop };
}
