import type { AvatarImageStatus } from '@agile-plus/primitives/avatar';

import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

/**
 * useAvatar（Root）的配置项。
 */
export interface UseAvatarOptions {
  /** 图片加载状态变化回调；状态去重后只在真正变化时触发 */
  onLoadingStatusChange?: (status: AvatarImageStatus) => void;
}

/**
 * useAvatar（Root）的返回值。
 *
 * Root 只持有加载状态这一份真源，Image 上报、Fallback 读取，避免两处状态互相竞争。
 */
export interface UseAvatarReturn {
  /** 当前图片加载状态 */
  imageStatus: Ref<AvatarImageStatus>;

  /**
   * 写入加载状态；与当前值相同时不重复触发回调。
   *
   * @param status 新状态。
   */
  setImageStatus(status: AvatarImageStatus): void;

  /** 根元素属性表（data-status） */
  getRootAttrs(): Record<string, unknown>;
}

/**
 * useAvatarImage 的配置项。
 */
export interface UseAvatarImageOptions {
  /** 图片地址；为空时状态回到 idle */
  src?: MaybeRefOrGetter<string | undefined>;

  /** 替代文本 */
  alt?: MaybeRefOrGetter<string | undefined>;

  /** 状态上报入口，通常接 Root 的 setImageStatus */
  onStatusChange: (status: AvatarImageStatus) => void;
}

/**
 * useAvatarImage 的返回值。
 */
export interface UseAvatarImageReturn {
  /** img 属性表（src / alt） */
  getImageAttrs(): Record<string, unknown>;

  /** 绑定到 img 的 @load */
  onLoad(): void;

  /** 绑定到 img 的 @error */
  onError(): void;

  /**
   * 绑定 img 元素，传给模板的 :ref。
   *
   * @param node 元素实例，卸载时为 null。
   */
  setImageElement(node: unknown): void;
}

/**
 * useAvatarFallback 的配置项。
 */
export interface UseAvatarFallbackOptions {
  /** 图片加载状态来源，通常读 Root 的 imageStatus */
  status: MaybeRefOrGetter<AvatarImageStatus>;

  /**
   * 延迟显示毫秒数，默认 0。
   *
   * 大于 0 时 fallback 等待这段时间再出现，避免缓存图片瞬间命中时闪一下；
   * 加载失败不受延迟影响，立即显示。
   */
  delayMs?: MaybeRefOrGetter<number | undefined>;
}

/**
 * useAvatarFallback 的返回值。
 */
export interface UseAvatarFallbackReturn {
  /** 此刻是否应当渲染 fallback */
  canRender: ComputedRef<boolean>;
}