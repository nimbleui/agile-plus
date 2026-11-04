import type { ToastSwipeDetail } from '@agile-plus/headless';

/**
 * ToastProvider 的组件属性。
 *
 * 不渲染任何 DOM，只下发配置与共享状态；`announceContainer` 是元素实例而不是
 * 响应式来源，因此按普通对象 prop 传入即可。
 */
export interface ToastProviderProps {
  /**
   * 每条通知的标签，作为读屏播报的前缀。
   *
   * @default 'Notification'
   */
  label?: string;

  /**
   * 自动关闭时长（毫秒），0 / NaN / Infinity 表示常驻。
   *
   * @default 5000
   */
  duration?: number;

  /**
   * 触发关闭的滑动方向。
   *
   * @default 'right'
   */
  swipeDirection?: 'up' | 'down' | 'left' | 'right';

  /**
   * 关闭所需的最小滑动距离（像素）。
   *
   * @default 50
   */
  swipeThreshold?: number;

  /**
   * announcer 挂载的容器，默认 body。
   *
   * 在模态框或焦点陷阱内使用时应指向容器内部，否则 aria-modal 会让通知读不出来。
   *
   * @default undefined
   */
  announceContainer?: Element | DocumentFragment;
}

/**
 * ToastViewport 的组件属性。
 *
 * 不提供 `as` / `asChild`：视口由包裹层（region）与列表（ol）两个职责不同的元素
 * 组成，替换标签会破坏 portal 目标与焦点代理的结构，语义上无法只靠一个标签名表达。
 */
export interface ToastViewportProps {
  /**
   * 把焦点移到视口的快捷键，每项是布尔标志名或 `event.code`。
   *
   * @default ['F8']
   */
  hotkey?: string[];

  /**
   * 视口的 aria-label 模板，`{hotkey}` 会替换成按键文案。
   *
   * @default 'Notifications ({hotkey})'
   */
  label?: string;
}

/**
 * ToastRoot 的组件属性。
 */
export interface ToastRootProps {
  /**
   * 受控打开状态，传入后进入受控模式。
   *
   * @default undefined
   */
  open?: boolean;

  /**
   * 非受控模式的初始打开状态。
   *
   * @default true
   */
  defaultOpen?: boolean;

  /**
   * 本条通知的时长，覆盖 Provider 的默认值。
   *
   * @default undefined
   */
  duration?: number;

  /**
   * 通知敏感度，决定 announcer 的 aria-live。
   *
   * @default 'foreground'
   */
  type?: 'foreground' | 'background';

  /**
   * 强制保留在 DOM 中，由外部接管进出场动画。
   *
   * @default false
   */
  forceMount?: boolean;

  /**
   * 渲染的目标标签名。
   *
   * @default 'li'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * ToastRoot 的事件。
 *
 * 滑动手势事件携带钳制后的位移，消费者据此做自定义动画或埋点。
 */
export interface ToastRootEmits {
  /** 打开状态变化时触发，配合 v-model:open 使用 */
  'update:open': [open: boolean];

  /** 按 Escape 时触发，调用 preventDefault 可阻止关闭 */
  'escape-keydown': [event: KeyboardEvent];

  /** 自动计时被暂停（指针进入视口、窗口失焦等） */
  pause: [];

  /** 自动计时恢复 */
  resume: [];

  /** 滑动越过启动阈值 */
  'swipe-start': [detail: ToastSwipeDetail];

  /** 滑动过程中持续触发 */
  'swipe-move': [detail: ToastSwipeDetail];

  /** 滑动未达阈值，回弹保留 */
  'swipe-cancel': [detail: ToastSwipeDetail];

  /** 滑动达到阈值，通知即将关闭 */
  'swipe-end': [detail: ToastSwipeDetail];
}

/**
 * ToastTitle 的组件属性。
 *
 * 只是带 data-part 的容器：Radix 也不给标题分配 id 或建立 aria 关联，播报文本由
 * announcer 从 DOM 直接收集。
 */
export interface ToastTitleProps {
  /**
   * 渲染的目标标签名。
   *
   * @default 'div'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * ToastDescription 的组件属性，与标题同构。
 */
export interface ToastDescriptionProps {
  /**
   * 渲染的目标标签名。
   *
   * @default 'div'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * ToastAction 的组件属性。
 */
export interface ToastActionProps {
  /**
   * 替代朗读文案，必填。
   *
   * 按钮的可见文案（如「撤销」）对读屏用户缺少上下文，altText 要写清操作的落点。
   * 传空字符串时组件不渲染并告警，与 Radix 一致。
   */
  altText: string;

  /**
   * 渲染的目标标签名。
   *
   * @default 'button'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * ToastClose 的组件属性。
 */
export interface ToastCloseProps {
  /**
   * 渲染的目标标签名。
   *
   * @default 'button'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}
