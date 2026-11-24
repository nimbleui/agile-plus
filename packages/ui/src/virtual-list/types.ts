import type { VirtualListItemKey } from '@agile-plus/headless';

/**
 * VirtualList 的组件属性。
 *
 * 数据驱动：项数、区间、padding 全部由本组件从 `items` 推出，消费者只负责行内容。
 * 可滚动的盒高是行为前提，`height` 不传时交给样式层或宿主样式表设，本层不会凭空撑高。
 */
export interface VirtualListProps<T> {
  /** 数据源，长度即项数；默认空数组 */
  items?: readonly T[];

  /**
   * 返回当前项的唯一稳定身份；高度缓存与行 DOM 都按它复用。
   *
   * 不传时使用下标，整体替换或重排数据后需要手动调用 `invalidateMeasurements()`。
   */
  itemKey?: (item: T, index: number) => VirtualListItemKey;

  /**
   * 未测量项的预估高度，同时决定滚动条长度。
   *
   * 不传即交给无头层默认值；传 0 或非法值会被抬到 1，因为高度为 0 时总高只由已测项构成，
   * 滚动条会随滚动不断伸缩。
   */
  estimateSize?: number;

  /** 视口外前后各预渲染的项数，不传即默认 3；显式 0 表示关闭预渲染 */
  overscan?: number;

  /** 视口高度，数字按 px 处理；这是「能不能滚」的前提，不是装饰 */
  height?: string | number;
}
