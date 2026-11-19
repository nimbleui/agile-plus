import type { TooltipDataState, TooltipDelayInput } from './types';

/** 常规打开延迟，与 Radix Tooltip 的 delayDuration 缺省值一致。 */
export const DEFAULT_TOOLTIP_DELAY = 700;

/**
 * 跳过延迟的时间窗，与 Radix 的 skipDelayDuration 缺省值一致。
 *
 * 用户在一组相邻触发元素之间移动时，逐个等 700ms 会让界面显得迟钝；
 * 刚看过一个提示就立即显示下一个，符合「已经表明想看提示」的意图。
 */
export const DEFAULT_TOOLTIP_SKIP_DELAY = 300;

/**
 * 算出本次打开该等多久。
 *
 * 只有在上一个提示关闭后的时间窗内才跳过延迟；窗口外一律回到常规延迟，
 * 否则一次悬停会让之后所有提示都变成即时弹出。lastClosedAt 为 null 表示从未打开过，
 * 此时不跳过——首次触发必须让用户有机会只是路过而不是想看提示。
 */
export function resolveOpenDelay(input: TooltipDelayInput): number {
  const { delayDuration, skipDelayDuration, lastClosedAt, now } = input;

  if (lastClosedAt === null) return delayDuration;

  return now - lastClosedAt < skipDelayDuration ? 0 : delayDuration;
}

/**
 * 组合出 data-state。
 *
 * 关闭态不区分来源：样式层只需要知道「现在不显示」，退场动画由 presence 负责。
 */
export function getTooltipDataState(open: boolean, instant: boolean): TooltipDataState {
  if (!open) return 'closed';

  return instant ? 'instant-open' : 'delayed-open';
}
