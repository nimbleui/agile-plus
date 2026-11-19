/**
 * Avatar 的类型与常量。
 *
 * 对齐对象是 radix-ui/primitives 的 `packages/react/avatar/src/avatar.tsx`：
 * Root 持有图片加载状态，Image 上报状态，Fallback 在图片未就绪时按延迟策略补位。
 * 缩写生成是本库额外提供的纯算法（Radix 把 fallback 内容完全交给消费者）。
 */

/**
 * 图片加载状态机。
 *
 * - `idle`：尚未开始加载（无 src 或未挂载）。
 * - `loading`：加载中。
 * - `loaded`：加载成功，显示图片。
 * - `error`：加载失败，显示 fallback。
 */
export type AvatarImageStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * 根元素属性表的输入。
 */
export interface AvatarRootAttrsInput {
  /** 当前图片加载状态，写成 data-status 供样式层与测试读取 */
  status: AvatarImageStatus;
}

/**
 * 图片元素属性表的输入。
 */
export interface AvatarImageAttrsInput {
  /** 图片地址 */
  src?: string;

  /** 替代文本；装饰性头像可给空串 */
  alt?: string;
}

/**
 * Fallback 可见性判定的输入。
 */
export interface AvatarFallbackInput {
  /** 当前图片加载状态 */
  status: AvatarImageStatus;

  /** 延迟显示的毫秒数；<=0 表示不延迟 */
  delayMs: number;

  /** 延迟计时是否已到点 */
  delayElapsed: boolean;
}