import type { ComputedRef, CSSProperties, MaybeRefOrGetter, Ref } from 'vue';

import type {
  FloatingArrowOptions,
  FloatingAvailableSpace,
  FloatingOffset,
  FloatingPlacement,
} from '@agile-plus/primitives/floating';

/**
 * 定位策略，默认 `absolute`。
 *
 * - `absolute`：结果换算成页面坐标（视口坐标 + 滚动量）。浮层落在文档层，窗口滚动由合成器
 *   带着它一起移动，主线程不必逐帧追，滚动跟随因此没有滞后。**前提是浮层的 offsetParent
 *   是文档本身**，即浮层被 portal 到 body 且 body/html 未定位——本库的浮层都走 Teleport
 *   到 body，与该前提一致。
 * - `fixed`：结果就是视口坐标，浮层相对视口定位，窗口滚动靠 scroll 事件逐帧重算追赶；
 *   合成器推进滚动的中间帧里浮层还在旧位置，快速滚动会看到抖动。它是浮层被放进已定位或
 *   带 transform 的祖先时的逃生门——那种环境下 absolute 的页面坐标前提不成立。
 */
export type FloatingStrategy = 'absolute' | 'fixed';

/** useFloating 的配置。几何相关字段与 primitives 的同名选项一一对应。 */
export interface UseFloatingOptions {
  /** 期望位置，默认 'bottom'；可为响应式来源，变化后由使用方请求更新。 */
  placement?: MaybeRefOrGetter<FloatingPlacement>;
  /** 与锚点的间距 */
  offset?: number | FloatingOffset;
  /** 空间不足时翻转，默认 true */
  flip?: boolean;
  /** 沿交叉轴钳制进边界，默认 true */
  shift?: boolean;
  /** 与边界的最小留白，默认 0 */
  padding?: number;
  /** 需要箭头时给出尺寸；不给则 arrowStyle 为空对象 */
  arrow?: FloatingArrowOptions;
  /** 定位策略，默认 'absolute'；前提与 fixed 逃生门见 FloatingStrategy */
  strategy?: FloatingStrategy;
  /**
   * 是否处于打开状态，默认 true。
   *
   * 关闭时不挂监听、不测量：浮层不可见时持续跟随滚动是纯浪费，
   * 而且此时元素尺寸为 0，测量结果也没有意义。
   */
  open?: MaybeRefOrGetter<boolean>;
  /** 裁剪边界元素；缺省用视口。浮层放在滚动容器里时传该容器。 */
  boundary?: MaybeRefOrGetter<HTMLElement | null>;
}

/** useFloating 的返回值。 */
export interface UseFloatingReturn {
  /** 绑到锚点元素 */
  referenceRef: Ref<HTMLElement | null>;
  /** 绑到浮层元素 */
  floatingRef: Ref<HTMLElement | null>;
  /** 最终采用的左上角坐标，已按 strategy 换算 */
  x: ComputedRef<number>;
  y: ComputedRef<number>;
  /** 实际位置：翻转后可能与请求的 placement 不同，样式层据此决定箭头贴哪条边 */
  placement: ComputedRef<FloatingPlacement>;
  /**
   * 实际所在边一侧的可用空间，与坐标来自**同一次测量**。
   *
   * 消费者要限制浮层最大高度时读它，而不是自己再挂一套 scroll / resize 监听：
   * 两套监听会在同一帧里各读一次布局，既浪费也会让位置与尺寸差一帧。
   * 未测量过时为 null。
   */
  availableSpace: ComputedRef<FloatingAvailableSpace | null>;
  /** 可直接绑到浮层的内联样式 */
  floatingStyle: ComputedRef<CSSProperties>;
  /**
   * 可直接绑到箭头的内联样式，只含交叉轴偏移。
   *
   * 箭头贴浮层哪条边由 placement 决定，属于样式层职责，这里不产出。
   */
  arrowStyle: ComputedRef<CSSProperties>;
  /** 请求一次更新；同一帧内重复调用只会测量一次 */
  update(): void;
}
