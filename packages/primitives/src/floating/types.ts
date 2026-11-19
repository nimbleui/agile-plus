/**
 * 浮层定位的纯数据契约。
 *
 * 本模块只做「快照 → 坐标」的计算，不读取也不写入 DOM：几何由调用方一次性量好传进来，
 * 因此同一份输入永远得到同一份输出，可以在 node 环境直接断言，也能被任意框架适配层复用。
 *
 * 坐标系约定：结果的 x/y 与传入的 reference / boundary 处于**同一坐标空间**。
 * 调用方传 `getBoundingClientRect()` 的视口坐标，得到的就是视口坐标（适用于 `position: fixed`）；
 * 要用于 `position: absolute`，由适配层减去 offsetParent 的矩形与滚动量，本层不感知文档结构。
 */

/** 浮层相对锚点的四条边。 */
export type FloatingSide = 'top' | 'right' | 'bottom' | 'left';

/** 沿锚点边的对齐方式；缺省为 center。 */
export type FloatingAlign = 'start' | 'center' | 'end';

/** 完整位置描述，可只给边（等价于该边 + center）。 */
export type FloatingPlacement = FloatingSide | `${FloatingSide}-${FloatingAlign}`;

/** 轴对齐矩形。x/y 是左上角坐标。 */
export interface FloatingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 视口尺寸；不含坐标，边界矩形默认以原点为左上角。 */
export interface FloatingViewport {
  width: number;
  height: number;
}

/**
 * 一次定位所需的全部几何快照。
 *
 * floating 只有 width/height 有意义：它还没被定位，x/y 是上一轮的结果，
 * 参与计算会让本轮输出依赖历史状态。
 */
export interface FloatingSnapshot {
  /** 锚点矩形 */
  reference: FloatingRect;
  /** 浮层尺寸（x/y 被忽略） */
  floating: FloatingRect;
  /** 视口尺寸 */
  viewport: FloatingViewport;
  /**
   * 裁剪边界，缺省为整个视口。
   *
   * 浮层放在滚动容器里时传该容器的矩形，翻转与钳制就会以它为准而不是视口。
   */
  boundary?: FloatingRect;
}

/** 主轴是浮层离开锚点的方向，交叉轴与之垂直。 */
export interface FloatingOffset {
  /** 与锚点的间距，默认 0 */
  mainAxis?: number;
  /** 沿锚点边的额外平移，默认 0 */
  crossAxis?: number;
}

/** 箭头尺寸与它距离浮层两端的最小留白。 */
export interface FloatingArrowOptions {
  /** 箭头边长（正方形），用于计算中心偏移与两端留白 */
  size: number;
  /** 箭头中心距浮端边缘的最小距离，默认 0 */
  padding?: number;
}

/** 定位配置。 */
export interface FloatingOptions {
  /** 期望位置，默认 'bottom' */
  placement?: FloatingPlacement;
  /** 与锚点的间距；给数字时等价于 { mainAxis: 数字 } */
  offset?: number | FloatingOffset;
  /** 空间不足时是否翻转到对边与对立对齐，默认 true */
  flip?: boolean;
  /** 是否沿交叉轴钳制进边界，默认 true */
  shift?: boolean;
  /** 与边界的最小留白，默认 0 */
  padding?: number;
  /** 需要箭头中心偏移时给出；缺省则结果里 arrow 为 null */
  arrow?: FloatingArrowOptions;
}

/**
 * 箭头在浮层自身坐标系里的中心偏移。
 *
 * 恰好一个轴非 null：top/bottom 时是 x，left/right 时是 y。
 * 另一条边（贴着浮层哪一侧）由 placement 决定，属于样式层职责，本层不返回。
 */
export interface FloatingArrowPosition {
  x: number | null;
  y: number | null;
}

/**
 * 实际所在边一侧的可用空间。
 *
 * 由 {@link FloatingResult} 的 placement 决定量哪一侧，因此必须先定位再取空间。
 * 典型用途是限制浮层最大高度，让它永远不超出裁剪边界。
 */
export interface FloatingAvailableSpace {
  width: number;
  height: number;
}

/** 一次定位的结果。 */
export interface FloatingResult {
  /** 浮层左上角坐标，与输入快照同一坐标空间 */
  x: number;
  y: number;
  /** 实际采用的位置：翻转后可能与请求的 placement 不同 */
  placement: FloatingPlacement;
  /** 箭头中心偏移；未配置 arrow 时为 null */
  arrow: FloatingArrowPosition | null;
}
