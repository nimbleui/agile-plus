/**
 * ScrollArea 原语层类型定义。
 *
 * 本层只做两类纯计算：滚动条可见性判定、thumb 尺寸与偏移的正反算。
 * 不读取 DOM、不引用 Design Token：几何输入是已测好的像素数值，输出也是像素数值，
 * 因此可以在没有浏览器的环境下完整单测。
 *
 * 刻意没有状态机：四态可见性的输出完全由「是否溢出、是否 hover、最近是否滚动、
 * 是否拖拽」这四个输入决定，没有需要集中约束的状态转换历史；定时器只负责让
 * 「最近是否滚动」这个输入变干净，属于适配层职责。
 */

/**
 * 滚动条出现时机，取值与默认值对齐 Radix 的 `type`。
 *
 * - `hover`：仅在指针悬停、聚焦或拖拽时出现（Radix 默认）。
 * - `scroll`：内容滚动时出现，停止 `scrollHideDelay` 后隐藏。
 * - `always`：始终出现。
 * - `auto`：内容溢出时始终出现，未溢出时不出现。
 */
export type ScrollAreaType = 'hover' | 'scroll' | 'always' | 'auto';

/**
 * 滚动条朝向，同时用于 `data-orientation`。
 */
export type ScrollAreaOrientation = 'vertical' | 'horizontal';

/**
 * 滚动条与 thumb 的可见性，对应 `data-state`。
 */
export type ScrollbarVisibility = 'visible' | 'hidden';

/**
 * 可见性判定的输入快照。
 *
 * 四个输入都由适配层从事件与定时器归一化得到，本层不判断「hover 是否成立」这类
 * 浏览器行为，只做布尔组合。
 */
export interface ScrollbarVisibilityInput {
  /**
   * 用户是否正在与该滚动容器交互：指针悬停在其上，或键盘焦点落在其中。
   *
   * 必须包含聚焦情形，否则用键盘滚动时 `hover` 类型的滚动条永远不出现。
   */
  interacting: boolean;

  /** 是否正在拖拽 thumb；拖拽中必须可见，否则 thumb 会在指针下消失 */
  dragging: boolean;

  /** 最近一次滚动是否仍在 `scrollHideDelay` 窗口内 */
  recentlyScrolled: boolean;

  /** 内容在当前朝向上是否溢出；未溢出时任何类型都不应出现滚动条 */
  hasOverflow: boolean;
}

/**
 * thumb 几何计算所需的像素快照。
 *
 * 单位统一为 px，且必须是同一朝向下的数值：vertical 传高度、horizontal 传宽度。
 */
export interface ThumbMetricsInput {
  /**
   * 轨道长度，即视口在该朝向下的可视尺寸。
   *
   * 不含角部（corner）修正，与实际滚动区近似；这正是 Radix 的处理方式。
   */
  viewportSize: number;

  /** 内容在该朝向下的总尺寸，含溢出部分 */
  scrollSize: number;

  /** 当前滚动偏移（`scrollTop` 或 `scrollLeft`） */
  scrollOffset: number;

  /**
   * thumb 的最小长度，避免内容远大于视口时 thumb 细到无法点中。
   *
   * Radix 未公开该常量，本层将其显式化并允许覆盖。
   *
   * @default 20
   */
  minThumbSize?: number;
}

/**
 * thumb 的几何结果，可直接写成内联 style。
 */
export interface ThumbMetrics {
  /** thumb 长度（px），无溢出时为 0 */
  size: number;

  /** thumb 在轨道内的偏移（px），无溢出时为 0 */
  offset: number;

  /** 内容是否溢出，决定滚动条是否应当存在 */
  hasOverflow: boolean;
}

/**
 * 从 thumb 偏移反算滚动偏移所需的快照。
 *
 * 必须与正算使用同一组输入（尤其是同一 size），否则拖拽会与滚动互相抖动。
 */
export interface ThumbDragInput {
  /** thumb 当前在轨道内的偏移 */
  thumbOffset: number;

  /** 轨道长度 */
  viewportSize: number;

  /** 内容总尺寸 */
  scrollSize: number;

  /**
   * thumb 长度，由正算得到并在此复用。
   *
   * 不重新计算是为了避免最小尺寸钳制在两个方向上产生不一致的映射。
   */
  thumbSize: number;
}
