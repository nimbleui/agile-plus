import type { FloatingRect, FloatingSide } from '../floating/types';

/**
 * Tooltip 的纯数据契约。
 *
 * 与 Toast 一样，本层不持有定时器：延迟只表达为「该等多久」的决策，
 * 何时开始计时、何时取消由适配层决定，因此判定逻辑能在 node 环境直接断言。
 */

/**
 * 暴露给样式层的开合状态。
 *
 * 区分 delayed-open 与 instant-open 是为了让样式层能分别给过渡：
 * 刚打开的提示需要淡入，而连续触发（跳过延迟）时应当立即出现，否则会看成闪烁。
 */
export type TooltipDataState = 'closed' | 'delayed-open' | 'instant-open';

/** 打开来源。焦点触发不参与指针容差区，也不受「跳过延迟」影响。 */
export type TooltipTriggerSource = 'pointer' | 'focus';

/** 平面上的点，用于指针位置与容差区多边形。 */
export interface TooltipPoint {
  x: number;
  y: number;
}

/** 计算打开延迟所需的输入。 */
export interface TooltipDelayInput {
  /** 常规打开延迟（毫秒） */
  delayDuration: number;
  /** 上一个提示关闭后，多长时间内新提示立即打开（毫秒） */
  skipDelayDuration: number;
  /** 上一个提示的关闭时刻；从未打开过时为 null */
  lastClosedAt: number | null;
  /** 当前时刻，由调用方注入 */
  now: number;
}

/** 指针容差区判定输入。 */
export interface TooltipGraceAreaInput {
  /** 当前指针位置 */
  pointer: TooltipPoint;
  /** 触发元素矩形 */
  reference: FloatingRect;
  /** 提示内容矩形 */
  floating: FloatingRect;
  /** 提示实际所在的边，决定容差区连接哪两条边 */
  side: FloatingSide;
}
