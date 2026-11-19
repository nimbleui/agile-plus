import type { AvatarImageStatus } from '@agile-plus/primitives/avatar';

/**
 * AvatarRoot 的组件属性。
 */
export interface AvatarRootProps {
  /**
   * 渲染的目标标签名。
   *
   * @default 'span'
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
 * AvatarRoot 的事件。
 */
export interface AvatarRootEmits {
  /** 图片加载状态变化时触发 */
  'loading-status-change': [status: AvatarImageStatus];
}

/**
 * AvatarImage 的组件属性。
 */
export interface AvatarImageProps {
  /**
   * 图片地址。
   *
   * @default undefined
   */
  src?: string;

  /**
   * 替代文本；装饰性头像可给空串。
   *
   * @default undefined
   */
  alt?: string;

  /**
   * 渲染的目标标签名。
   *
   * @default 'img'
   */
  as?: string;

  /**
   * 不渲染自身，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * AvatarFallback 的组件属性。
 */
export interface AvatarFallbackProps {
  /**
   * 延迟显示毫秒数；大于 0 时避免缓存图片瞬间命中导致 fallback 闪一下。
   *
   * @default 0
   */
  delayMs?: number;

  /**
   * 渲染的目标标签名。
   *
   * @default 'span'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}