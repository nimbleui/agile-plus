/**
 * 文本省略的纯数据契约。
 *
 * 与 Select 一样刻意不建状态机：省略组件的状态只有「是否溢出」与「是否展开」两个
 * 彼此独立的量，任何交互都只是给其中之一赋值，不存在需要集中约束的非法组合。
 *
 * 溢出判定被拆成「调用方量好尺寸 → 本层纯计算」两步：scrollWidth / clientWidth 等
 * 读数由适配层在一个读取阶段量好传进来，本层不碰 DOM，因此判定可以在 node 环境
 * 直接断言，也能被其它框架的适配层复用。
 */

/**
 * 省略模式。
 *
 * - `single`：单行，尾部省略号。
 * - `multi`：多行，按行数截断（line-clamp）。
 * - `middle`：中间省略，保留尾部若干字符，适合文件名 / 路径 / 哈希。
 */
export type EllipsisMode = 'single' | 'multi' | 'middle';

/** 暴露给样式层与读屏的状态：未溢出 / 截断中 / 已展开。 */
export type EllipsisDataState = 'full' | 'clamped' | 'expanded';

/** multi 模式缺省行数。 */
export const DEFAULT_ELLIPSIS_LINES = 2;

/** middle 模式缺省保留的尾部字符数。 */
export const DEFAULT_ELLIPSIS_TAIL = 4;

/** 溢出判定输入：全部为适配层量好的标量。 */
export interface EllipsisOverflowInput {
  /** 当前模式 */
  mode: EllipsisMode;
  /** 是否已展开；展开态不截断，因此恒判为不溢出 */
  expanded: boolean;
  /** 截断元素的内容宽 */
  scrollWidth: number;
  /** 截断元素的可视宽 */
  clientWidth: number;
  /** 截断元素的内容高 */
  scrollHeight: number;
  /** 截断元素的可视高 */
  clientHeight: number;
}

/** 中间省略的切分输入。 */
export interface EllipsisMiddleInput {
  /** 完整文本 */
  text: string;
  /** 保留的尾部字符数；缺省 4 */
  tailChars?: number;
}

/** 中间省略的切分结果。head 始终是完整文本，靠 CSS 收缩出省略号。 */
export interface EllipsisMiddleSplit {
  /** 头部：完整文本，交给可收缩的省略容器 */
  head: string;
  /** 尾部：固定保留的末尾字符；文本不够长时为空串 */
  tail: string;
}
