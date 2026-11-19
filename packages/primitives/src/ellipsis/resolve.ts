import {
  DEFAULT_ELLIPSIS_LINES,
  DEFAULT_ELLIPSIS_TAIL,
} from './types';

import type {
  EllipsisDataState,
  EllipsisMiddleInput,
  EllipsisMiddleSplit,
  EllipsisMode,
  EllipsisOverflowInput,
} from './types';

/**
 * 归一化行数。
 *
 * single 与 middle 恒为 1 行：它们的截断语义就是单行，传入 lines 不该改变行为；
 * multi 取不小于 1 的整数，非法值回落到缺省行数，避免 line-clamp 拿到 0 / NaN
 * 后整段文本消失。
 *
 * @param mode 省略模式。
 * @param lines 调用方期望的行数。
 * @returns 实际生效的行数。
 */
export function resolveEllipsisLines(mode: EllipsisMode, lines?: number): number {
  if (mode !== 'multi') return 1;

  if (typeof lines !== 'number' || !Number.isFinite(lines)) return DEFAULT_ELLIPSIS_LINES;

  return Math.max(1, Math.floor(lines));
}

/**
 * 切出中间省略要固定保留的尾部。
 *
 * head 返回完整文本而不是「前半段」：中间省略靠 flex 让 head 收缩出省略号、tail 固定
 * 不收缩，因此不需要按宽度二分字符数（那会引入逐帧测量）。按码点切分而不是 UTF-16
 * 下标，避免把 emoji / 生僻字的代理对劈成两半。
 *
 * 文本本身不比保留数长时 tail 为空串：没有可隐藏的中段，整段直接显示。
 *
 * @param input 完整文本与保留尾部字符数。
 * @returns head（完整文本）与 tail（固定尾部）。
 */
export function splitMiddleEllipsis(input: EllipsisMiddleInput): EllipsisMiddleSplit {
  const chars = Array.from(input.text);
  const requested = input.tailChars ?? DEFAULT_ELLIPSIS_TAIL;
  const keep =
    typeof requested === 'number' && Number.isFinite(requested)
      ? Math.max(0, Math.floor(requested))
      : DEFAULT_ELLIPSIS_TAIL;

  if (chars.length <= keep) return { head: input.text, tail: '' };

  return { head: input.text, tail: chars.slice(chars.length - keep).join('') };
}

/**
 * 判定当前是否溢出。
 *
 * 单行与中间省略看横向（scrollWidth > clientWidth），多行看纵向（scrollHeight >
 * clientHeight）：line-clamp 的截断发生在纵向，横向永远不溢出。展开态恒为 false，
 * 因为此时没有截断；「是否曾经溢出」由适配层sticky 保留，用于继续显示收起按钮。
 *
 * @param input 模式、展开态与量好的四个尺寸读数。
 * @returns 是否溢出。
 */
export function resolveEllipsisOverflow(input: EllipsisOverflowInput): boolean {
  if (input.expanded) return false;

  if (input.mode === 'multi') return input.scrollHeight > input.clientHeight;

  return input.scrollWidth > input.clientWidth;
}

/**
 * 组合 data-state。
 *
 * 展开优先于溢出：展开态即使内容仍比容器高（例如容器限高）也应报 expanded，
 * 样式层据此去掉省略号与截断光标。
 *
 * @param input 溢出与展开状态。
 * @returns 三态之一。
 */
export function getEllipsisDataState(input: {
  overflow: boolean;
  expanded: boolean;
}): EllipsisDataState {
  if (input.expanded) return 'expanded';

  return input.overflow ? 'clamped' : 'full';
}

/**
 * 截断元素的功能性内联样式。
 *
 * 截断是组件的**行为**而不是装饰，因此与隐藏原生 input 同一条例外：由无头层产出、
 * 无样式层直接绑定，保证不引 CSS 也能正确省略；颜色 / 字号 / 间距仍留给样式层。
 * 展开态返回空对象，交还自然排版。
 *
 * @param mode 省略模式。
 * @param lines 生效行数（multi 用）。
 * @param expanded 是否展开。
 * @returns 可直接绑到截断元素的样式对象。
 */
export function getEllipsisClampStyle(
  mode: EllipsisMode,
  lines: number,
  expanded: boolean
): Record<string, string> {
  if (expanded) return {};

  if (mode === 'multi') {
    return {
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: String(lines),
      overflow: 'hidden',
    };
  }

  if (mode === 'middle') {
    return {
      flex: '1 1 auto',
      minWidth: '0',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    };
  }

  return {
    display: 'block',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  };
}

/**
 * 中间省略外层容器的功能性样式：flex 让 head 可收缩、tail 固定。
 *
 * 其它模式不需要外层布局，返回空对象。展开态同样返回空对象，让 head 自然换行。
 *
 * @param mode 省略模式。
 * @param expanded 是否展开。
 * @returns 外层容器样式对象。
 */
export function getEllipsisWrapperStyle(
  mode: EllipsisMode,
  expanded: boolean
): Record<string, string> {
  if (mode !== 'middle' || expanded) return {};

  return { display: 'flex', alignItems: 'baseline' };
}

/**
 * 中间省略尾部的功能性样式：不收缩、不换行，且不可被选中。
 *
 * user-select: none 是行为约束：tail 是 head 文本的重复副本，若可选中，用户复制
 * 会得到「…尾部 + 尾部」的重复串。
 *
 * @returns 尾部样式对象。
 */
export function getEllipsisTailStyle(): Record<string, string> {
  return { flex: 'none', whiteSpace: 'nowrap', userSelect: 'none' };
}
