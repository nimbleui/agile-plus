import type { EllipsisMode } from '@agile-plus/primitives/ellipsis';

/**
 * Ellipsis 的组件属性。
 *
 * 截断是行为不是装饰：功能性内联样式由无头层产出，本层只负责结构、ARIA 与插槽；
 * 颜色 / 字号 / 间距留给样式层。tooltip 复用同层 Tooltip，不另造浮层。
 */
export interface EllipsisProps {
  /** 省略模式，默认 'single' */
  mode?: EllipsisMode;
  /** multi 模式行数，默认 2 */
  lines?: number;
  /** middle 模式保留的尾部字符数，默认 4 */
  tailChars?: number;
  /** 溢出时是否显示「展开 / 收起」按钮，默认 false */
  expandable?: boolean;
  /** 展开按钮文案 */
  expandText?: string;
  /** 收起按钮文案 */
  collapseText?: string;
  /** 溢出且未展开时是否用 Tooltip 展示全文，默认 true */
  tooltip?: boolean;
  /** 受控展开态；不传即非受控 */
  expanded?: boolean;
  /** 非受控展开初值，默认 false */
  defaultExpanded?: boolean;
}

/** Ellipsis 的事件声明。 */
export interface EllipsisEmits {
  /** 展开态变化，配合 v-model:expanded 使用 */
  'update:expanded': [value: boolean];
}
