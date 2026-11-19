import type { EllipsisMode } from '@agile-plus/ui';

/** 尺寸变体，字号取自全局 font-size Token。 */
export type EllipsisSize = 'small' | 'middle' | 'large';

/**
 * 带样式 Ellipsis 的组件属性。
 *
 * 显式列出字段而不是 extends 导入类型：Vue SFC 编译器在部分环境下无法解析
 * 跨包导入类型作为 defineProps 基类型。
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
  /** 受控展开态 */
  expanded?: boolean;
  /** 非受控展开初值 */
  defaultExpanded?: boolean;
  /** 尺寸，默认 'middle' */
  size?: EllipsisSize;
}
