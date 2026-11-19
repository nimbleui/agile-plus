import type { ComputedRef, CSSProperties, MaybeRefOrGetter } from 'vue';

import type { EllipsisDataState, EllipsisMode } from '@agile-plus/primitives/ellipsis';

/** useEllipsis 的配置。 */
export interface UseEllipsisOptions {
  /** 省略模式，默认 'single' */
  mode?: MaybeRefOrGetter<EllipsisMode | undefined>;
  /** multi 模式行数，默认 2；single / middle 恒为 1 */
  lines?: MaybeRefOrGetter<number | undefined>;
  /** middle 模式保留的尾部字符数，默认 4 */
  tailChars?: MaybeRefOrGetter<number | undefined>;
  /** 受控展开态；undefined 表示非受控 */
  expanded?: MaybeRefOrGetter<boolean | undefined>;
  /** 非受控展开初值，默认 false */
  defaultExpanded?: boolean;
  /** 展开态变化回调 */
  onExpandedChange?: (expanded: boolean) => void;
}

/** useEllipsis 的返回值。 */
export interface UseEllipsisReturn {
  /** 生效模式 */
  mode: ComputedRef<EllipsisMode>;
  /** 生效行数 */
  lines: ComputedRef<number>;
  /** 是否溢出；展开态sticky 保留展开前的判定，用于继续显示收起按钮 */
  isOverflow: ComputedRef<boolean>;
  /** 是否展开 */
  expanded: ComputedRef<boolean>;
  /** 三态：full / clamped / expanded */
  dataState: ComputedRef<EllipsisDataState>;
  /** middle 模式固定保留的尾部文本 */
  tailText: ComputedRef<string>;
  /** 截断元素的功能性内联样式 */
  contentStyle: ComputedRef<CSSProperties>;
  /** middle 外层容器的功能性内联样式 */
  wrapperStyle: ComputedRef<CSSProperties>;
  /** middle 尾部的功能性内联样式 */
  tailStyle: ComputedRef<CSSProperties>;
  /** 切换展开 / 收起 */
  toggleExpanded(): void;
  /** 设置展开态 */
  setExpanded(next: boolean): void;
  /** 绑定截断元素（single/multi 为容器，middle 为 head） */
  setContentElement(node: unknown): void;
  /** 上报完整文本：middle 切尾部与文本变化后的重测都依赖它 */
  setText(text: string): void;
  /** 请求一次测量；同一帧内重复调用只量一次 */
  measure(): void;
}
