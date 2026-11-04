/**
 * Toast 的类型与默认值。
 *
 * 对齐对象是 radix-ui/primitives 的 `packages/react/toast/src/toast.tsx`
 * （main 分支），默认值与该文件中的解构默认值逐项一致，不再自行发明取值。
 */

/**
 * 通知的敏感度类型，决定 announcer 的 `aria-live`。
 *
 * - `foreground`：用户正在操作，内容必须立刻打断朗读（assertive）。
 * - `background`：后台产生的变化，等待当前朗读结束再补充（polite）。
 */
export type ToastType = 'foreground' | 'background';

/**
 * 触发关闭的滑动手势方向。
 *
 * 只能是单方向：Radix 用它同时决定 delta 的钳制符号与判定轴，
 * 提供四向自适应会让“下拉刷新”与“右滑关闭”无法区分。
 */
export type ToastSwipeDirection = 'up' | 'down' | 'left' | 'right';

/**
 * 滑动手势阶段，直接写入元素的 `data-swipe`。
 *
 * 空字符串表示没有进行中的手势：Radix 在指针按下时不清空该属性，
 * 因此样式需要同时处理「属性存在」与「属性为某阶段」两种选择器。
 */
export type ToastSwipePhase = 'start' | 'move' | 'cancel' | 'end';

/**
 * 二维指针位移。
 */
export interface ToastPoint {
  /** 水平位移，单位像素，右为正 */
  x: number;

  /** 垂直位移，单位像素，下为正 */
  y: number;
}

/**
 * 单帧滑动位移的判定输入。
 */
export interface ToastSwipeMoveInput {
  /** 相对指针按下位置的原始位移，未钳制 */
  delta: ToastPoint;

  /** 配置的手势方向 */
  direction: ToastSwipeDirection;

  /** 原生事件的 `pointerType`，触摸与指针的启动阈值不同 */
  pointerType: string;

  /** 本次按下交互是否已进入滑动，true 表示后续位移一律按 move 处理 */
  started: boolean;
}

/**
 * 单帧滑动位移的判定结果。
 */
export interface ToastSwipeMoveResult {
  /**
   * 本帧手势阶段。
   *
   * - `start`：首次越过启动阈值，需要写 `data-swipe="start"` 并捕获指针。
   * - `move`：滑动进行中，需要更新位移变量。
   * - `idle`：位移仍在阈值内，不做任何状态变化。
   * - `reset`：用户朝反方向拖动，本次按下内放弃手势，需要清空起点。
   */
  phase: 'start' | 'move' | 'idle' | 'reset';

  /** 只保留手势轴、且不朝反方向越界的位移 */
  clamped: ToastPoint;
}

/**
 * 指针抬起时的手势结论。
 */
export type ToastSwipeEndPhase = 'end' | 'cancel';

/**
 * 自动关闭计时的记账快照。
 *
 * 保存快照而不是保存 setTimeout 的句柄，是因为暂停必须扣减「已经消耗的时间」，
 * 而 `clearTimeout` + 重开无法得知消耗量；把这三个数抽成快照后，暂停/恢复/重置
 * 都变成可以在 node 环境下直接断言的纯函数。
 */
export interface ToastTimerSnapshot {
  /** 本次通知配置的总时长，单位毫秒 */
  duration: number;

  /** 本段计时的起始时间戳，暂停后失效但仍保留 */
  startedAt: number;

  /** 距离自动关闭还剩多少毫秒；允许为负，此时恢复会立即关闭 */
  remaining: number;
}

/**
 * 不传 `duration` 时使用的默认时长，与 Radix 的 5000 一致。
 */
export const DEFAULT_TOAST_DURATION = 5000;

/**
 * Provider 级别的默认通知标签，用于 announcer 文本前缀。
 *
 * Radix 用单数 `Notification`：每条通知被朗读时读作「Notification 已保存」。
 */
export const DEFAULT_TOAST_LABEL = 'Notification';

/**
 * Viewport 默认标签模板，`{hotkey}` 会替换成实际按键组合。
 */
export const DEFAULT_TOAST_VIEWPORT_LABEL = 'Notifications ({hotkey})';

/**
 * Viewport 默认聚焦快捷键。
 *
 * 只用 `code` 比较，避免 `Ctrl+Alt+T` 这类组合把 `event.key` 变成 `†` 后失配。
 */
export const DEFAULT_TOAST_VIEWPORT_HOTKEY = ['F8'];

/**
 * 默认滑动手势方向。
 */
export const DEFAULT_TOAST_SWIPE_DIRECTION: ToastSwipeDirection = 'right';

/**
 * 判定关闭所需的默认滑动距离，单位像素。
 */
export const DEFAULT_TOAST_SWIPE_THRESHOLD = 50;

/**
 * 触摸启动滑动所需的最小位移，单位像素。
 *
 * 触摸的手指抖动远大于鼠标，阈值过小会在轻点时误触发手势。
 */
export const TOAST_SWIPE_START_BUFFER_TOUCH = 10;

/**
 * 鼠标/触控笔启动滑动所需的最小位移，单位像素。
 */
export const TOAST_SWIPE_START_BUFFER_POINTER = 2;

/**
 * announcer 在 DOM 中的存活时间，单位毫秒。
 *
 * 朗读开始后必须保留文本，否则屏幕阅读器读到的是空节点；1 秒后移除，
 * 使同一条通知再次出现时仍能重新触发朗读。
 */
export const TOAST_ANNOUNCE_LIFETIME = 1000;

/**
 * 标记子树不参与朗读文本收集的属性。
 *
 * Radix 用 `data-radix-toast-announce-exclude` 带厂商前缀；本库属性名不对外
 * 承诺，因此去掉前缀，语义一致：Action/Close 按钮的可见文案不该被读两遍。
 */
export const TOAST_ANNOUNCE_EXCLUDE_ATTR = 'data-toast-announce-exclude';

/**
 * 被排除子树的替代朗读文案属性，供 Action 的 `altText` 使用。
 */
export const TOAST_ANNOUNCE_ALT_ATTR = 'data-toast-announce-alt';
