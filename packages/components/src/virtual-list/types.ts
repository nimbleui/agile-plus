import type { VirtualListItemKey } from '@agile-plus/ui/virtual-list';

/**
 * 带样式 VirtualList 的组件属性。
 *
 * 显式列出字段而不是 extends 导入 ui 层同名类型：Vue SFC 编译器在部分环境下无法解析跨包导入
 * 类型作为 defineProps 基类型（与 `ellipsis/types.ts` 同一取舍）。字段与无样式层保持一致，
 * 一致性由 `virtual-list.test.ts` 的 props 转发用例守住。
 */
export interface VirtualListProps<T> {
  /** 数据源；长度就是项数，追加时保留稳定身份的实测高度 */
  items?: readonly T[];

  /** 返回项的唯一稳定身份；不传时按下标记账，整体替换后需手动重测 */
  itemKey?: (item: T, index: number) => VirtualListItemKey;
  /** 未测量项的预估高度，默认 40 */
  estimateSize?: number;
  /** 视口上下各预渲染的项数，默认 3；显式 0 表示关闭预渲染 */
  overscan?: number;
  /** 滚动容器高度；数字按 px，字符串原样交给 CSS；不传则由外层决定高度 */
  height?: string | number;
}

/**
 * 成品层转发给消费者的四个动作，按结构声明。
 *
 * 本层的依赖只有 `@agile-plus/ui`（见 package.json），把无头层的 `UseVirtualListReturn` 引进来
 * 会多出一条跨层依赖；而这里要的只是「滚到哪、什么时候重测」这一组动作。结构是否与组件真实
 * expose 对得上，由 vue-tsc 在模板 ref 赋值处校验，不必为了类型好看把内部协议抬进公共 API。
 */
export interface VirtualListHandle {
  scrollToIndex(index: number): void;
  scrollIntoView(index: number): void;
  scrollToOffset(offset: number): void;
  invalidateMeasurements(): void;
}
