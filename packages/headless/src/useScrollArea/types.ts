import type { ComputedRef, CSSProperties, MaybeRefOrGetter, Ref } from 'vue';

import type {
  ScrollAreaOrientation,
  ScrollAreaType,
  ScrollbarVisibility,
} from '@agile-plus/primitives/scroll-area';

/**
 * useScrollArea Composable 的配置选项。
 *
 * 属性名与默认值对齐 Radix 的 ScrollArea.Root。
 */
export interface UseScrollAreaOptions {
  /**
   * 滚动条出现时机。
   *
   * @default 'hover'
   */
  type?: MaybeRefOrGetter<ScrollAreaType | undefined>;

  /**
   * `scroll` 与 `hover` 类型下，停止交互到隐藏之间的延迟（毫秒）。
   *
   * @default 600
   */
  scrollHideDelay?: number;

  /**
   * 文本方向，输出到根元素的 `dir`。
   *
   * 横向滚动偏移在 RTL 下的映射未做处理，详见组件文档的已知限制。
   *
   * @default undefined
   */
  dir?: MaybeRefOrGetter<'ltr' | 'rtl' | undefined>;

  /**
   * thumb 的最小可点中长度（px），透传给几何计算。
   *
   * @default 20
   */
  minThumbSize?: number;
}

/**
 * useScrollArea Composable 的返回值。
 *
 * 五个部件共用同一个上下文：Viewport 负责提供可测量的元素与滚动事件，
 * Scrollbar / Thumb 消费由几何计算得到的样式，Corner 只看两方向的可见性。
 *
 * 契约与其余组件一致：get*Props 只返回可 v-bind 的属性，事件通过 v-on 绑定；
 * 几何结果单独由 get*Style 返回，避免把 style 混进属性对象后被消费者的静态样式覆盖。
 */
export interface UseScrollAreaReturn {
  /** Viewport 元素引用，由 ScrollAreaViewport 在挂载时写入 */
  viewportRef: Ref<HTMLElement | null>;

  /** 当前生效的出现时机，供样式或文档调试读取 */
  type: ComputedRef<ScrollAreaType>;

  /** 请求一次测量更新，同一帧内的重复请求会被合并 */
  requestMeasure(): void;

  /** 获取根容器属性 */
  getRootProps(): Record<string, unknown>;

  /** 获取视口容器属性 */
  getViewportProps(): Record<string, unknown>;

  /**
   * 获取滚动条容器属性。
   *
   * @param orientation 滚动条朝向。
   */
  getScrollbarProps(orientation: ScrollAreaOrientation): Record<string, unknown>;

  /**
   * 获取 thumb 属性。
   *
   * @param orientation 滚动条朝向。
   */
  getThumbProps(orientation: ScrollAreaOrientation): Record<string, unknown>;

  /**
   * 获取 thumb 的几何样式（长度与位移）。
   *
   * @param orientation 滚动条朝向。
   */
  getThumbStyle(orientation: ScrollAreaOrientation): CSSProperties;

  /** 获取角部元素属性 */
  getCornerProps(): Record<string, unknown>;

  /** 角部是否应存在：仅当两个方向的滚动条同时可见 */
  isCornerVisible: ComputedRef<boolean>;

  /**
   * 查询某朝向的可见性，供部件决定自身是否渲染。
   *
   * @param orientation 滚动条朝向。
   */
  getVisibility(orientation: ScrollAreaOrientation): ScrollbarVisibility;

  /** 视口滚动事件处理器，绑定到 `@scroll` */
  onViewportScroll(): void;

  /** 视口指针进入处理器，绑定到 `@pointerenter` */
  onViewportPointerEnter(): void;

  /** 视口指针离开处理器，绑定到 `@pointerleave` */
  onViewportPointerLeave(): void;

  /** 视口内聚焦事件处理器，绑定到 `@focusin`：键盘滚动也需要看到滚动条 */
  onViewportFocusin(): void;

  /** 视口内失焦处理器，绑定到 `@focusout` */
  onViewportFocusout(): void;

  /**
   * 滚动条指针进入处理器，绑定到 `@pointerenter`。
   *
   * @param orientation 该滚动条朝向。
   */
  onScrollbarPointerEnter(orientation: ScrollAreaOrientation): void;

  /**
   * 滚动条指针离开处理器，绑定到 `@pointerleave`。
   *
   * @param orientation 该滚动条朝向。
   */
  onScrollbarPointerLeave(orientation: ScrollAreaOrientation): void;

  /**
   * thumb 按下处理器，绑定到 `@pointerdown`。
   *
   * @param event 原生指针事件。
   * @param orientation 该 thumb 朝向。
   */
  onThumbPointerDown(event: PointerEvent, orientation: ScrollAreaOrientation): void;
}
