import type { ComputedRef, MaybeRefOrGetter } from 'vue';

import type {
  FloatingArrowOptions,
  FloatingOffset,
  FloatingPlacement,
  TooltipDataState,
} from '@agile-plus/primitives';

import type { FloatingStrategy, UseFloatingReturn } from '../useFloating';

/** useTooltip 的配置。 */
export interface UseTooltipOptions {
  /** 受控开合；undefined 表示非受控 */
  open?: MaybeRefOrGetter<boolean | undefined>;
  /** 非受控初值，默认 false */
  defaultOpen?: boolean;
  /** 开合变化回调，受控模式下是新值唯一的落地路径 */
  onOpenChange?: (open: boolean) => void;
  /** 常规打开延迟，默认 700ms */
  delayDuration?: MaybeRefOrGetter<number>;
  /** 同一触发元素上次关闭后多长时间内重新悬停立即打开，默认 300ms */
  skipDelayDuration?: MaybeRefOrGetter<number>;
  /**
   * 禁用「内容可悬停」。
   *
   * 打开后指针离开触发元素就立即关闭，不再建立容差区。提示里没有可点内容时应当开启，
   * 否则提示会跟着指针多停留一段，看起来像关不掉。
   */
  disableHoverableContent?: MaybeRefOrGetter<boolean>;
  /** 期望位置，默认 'top'（与 Radix Tooltip 一致） */
  placement?: FloatingPlacement;
  /** 与触发元素的间距 */
  offset?: number | FloatingOffset;
  /** 空间不足时翻转，默认 true */
  flip?: boolean;
  /** 沿交叉轴钳制，默认 true */
  shift?: boolean;
  /** 与边界的最小留白 */
  padding?: number;
  /** 定位策略，默认 'absolute'；前提与 fixed 逃生门见 FloatingStrategy */
  strategy?: FloatingStrategy;
  /** 需要箭头时给出尺寸 */
  arrow?: FloatingArrowOptions;
}

/** useTooltip 的返回值。 */
export interface UseTooltipReturn {
  /** 当前是否打开 */
  isOpen: ComputedRef<boolean>;
  /** 立即打开（跳过延迟） */
  open(): void;
  /** 立即关闭并清理计时与容差区 */
  close(): void;
  /** 供样式层区分淡入与即时出现 */
  dataState: ComputedRef<TooltipDataState>;
  /** 提示内容 id，触发元素的 aria-describedby 指向它 */
  contentId: string;
  /** 定位能力：元素 ref、坐标、样式与实际 placement */
  floating: UseFloatingReturn;
  /** 触发元素属性 */
  getTriggerProps(): Record<string, unknown>;
  /** 提示内容属性 */
  getContentProps(): Record<string, unknown>;
  onTriggerPointerEnter(): void;
  onTriggerPointerLeave(): void;
  onTriggerFocus(): void;
  onTriggerBlur(): void;
  onTriggerKeydown(event: KeyboardEvent): void;
  onContentPointerEnter(): void;
  onContentPointerLeave(): void;
}
