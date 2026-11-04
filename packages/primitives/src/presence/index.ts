/**
 * Presence 挂载状态机。
 *
 * 状态与转移完全对齐 radix-ui/primitives 的 `usePresence`：退出动画进行中时元素
 * 必须继续留在 DOM 里，否则动画连同一帧被删掉；但也不能无限留下去，于是用
 * `unmountSuspended` 把「已经决定卸载」与「动画还没结束」拆开。
 *
 * 这套判定之所以值得单独放一层：它是纯状态逻辑，输入是事件、输出是状态，可以
 * 在没有 DOM 的 node 环境下断言；而「什么时候发哪个事件」需要读 computed style
 * 与动画事件，那部分留在 headless 层。
 */

/**
 * 元素的挂载状态。
 *
 * - `mounted`：在 DOM 中且应当存在。
 * - `unmountSuspended`：已经请求卸载，但退出动画还没结束。
 * - `unmounted`：不在 DOM 中。
 */
export type PresenceState = 'mounted' | 'unmountSuspended' | 'unmounted';

/**
 * 驱动状态机的事件。
 *
 * `ANIMATION_OUT` 只在退出动画确实开始时发送；识别不出动画时直接发 `UNMOUNT`，
 * 这样没有配动画的组件不会被挂住。
 */
export type PresenceEvent = 'MOUNT' | 'UNMOUNT' | 'ANIMATION_OUT' | 'ANIMATION_END';

const TRANSITIONS: Readonly<Record<PresenceState, Partial<Record<PresenceEvent, PresenceState>>>> =
  {
    mounted: { UNMOUNT: 'unmounted', ANIMATION_OUT: 'unmountSuspended' },
    unmountSuspended: { MOUNT: 'mounted', ANIMATION_END: 'unmounted' },
    unmounted: { MOUNT: 'mounted' },
  };

/**
 * 计算事件发生后的新状态。
 *
 * 非法事件按原状态返回，而不是抛错：动画事件可能来自用户样式里的重复触发或
 * 迟到的 `animationcancel`，运行期把它当噪声忽略比让整个组件崩溃更合适。
 * 例如 `unmounted` 收到 `ANIMATION_END` 就是迟到事件的典型情况。
 *
 * @param state 当前状态。
 * @param event 触发的事件。
 * @returns 下一个状态。
 */
export function sendPresenceEvent(state: PresenceState, event: PresenceEvent): PresenceState {
  return TRANSITIONS[state][event] ?? state;
}

/**
 * 判断状态是否表示元素应当留在 DOM 中。
 *
 * @param state 当前状态。
 * @returns true 表示应当渲染元素，包含退出动画挂起的期间。
 */
export function isPresencePresent(state: PresenceState): boolean {
  return state === 'mounted' || state === 'unmountSuspended';
}
