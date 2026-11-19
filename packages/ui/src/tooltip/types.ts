import type {
  FloatingArrowOptions,
  FloatingOffset,
  FloatingPlacement,
} from '@agile-plus/primitives/floating';

import type { FloatingStrategy } from '@agile-plus/headless';

/**
 * TooltipRoot 的组件属性。
 *
 * 开合是受控/非受控双模式：`open` 缺省必须保持 undefined，
 * 被 cast 成 false 会让组件变成「受控且恒为关闭」，非受控用法静默失效。
 */
export interface TooltipRootProps {
  /** 受控开合；不传即非受控 */
  open?: boolean;
  /** 非受控初值，默认 false */
  defaultOpen?: boolean;
  /** 开合变化回调，与 update:open 事件同时给出 */
  onOpenChange?: (open: boolean) => void;
  /** 常规打开延迟，默认 700ms */
  delayDuration?: number;
  /** 同一触发元素上次关闭后多长时间内重新悬停立即打开，默认 300ms */
  skipDelayDuration?: number;
  /** 禁用内容可悬停：离开触发元素立即关闭 */
  disableHoverableContent?: boolean;
  /** 期望位置，默认 'top' */
  placement?: FloatingPlacement;
  /** 与触发元素的间距，默认 8 */
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

/** TooltipTrigger 的组件属性。 */
export interface TooltipTriggerProps {
  /** 渲染标签，默认 button */
  as?: string;
  /** 不渲染自身，把属性与事件合并到唯一子元素上 */
  asChild?: boolean;
}

/** TooltipContent 的组件属性。 */
export interface TooltipContentProps {
  /** portal 目标，默认 body */
  container?: string | HTMLElement;
  /** 关闭后仍保留在 DOM 里，用于自行处理退场动画 */
  forceMount?: boolean;
  /** 打开过一次之后常驻 DOM，关闭只切 data-state 不卸载；首次打开前仍懒挂载，默认 false */
  keepMounted?: boolean;
}

/** TooltipArrow 的组件属性。 */
export interface TooltipArrowProps {
  /** 渲染标签，默认 span */
  as?: string;
  /** 不渲染自身，把属性合并到唯一子元素上 */
  asChild?: boolean;
}
