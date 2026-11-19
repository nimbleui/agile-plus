import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy } from '@agile-plus/headless';

/** PopoverRoot 的组件属性。 */
export interface PopoverRootProps {
  /** 受控开合；不传即非受控 */
  open?: boolean;
  /** 非受控初值，默认 false */
  defaultOpen?: boolean;
  /** 开合变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 期望位置，默认 'bottom' */
  placement?: FloatingPlacement;
  /** 与触发元素间距，默认 8 */
  offset?: number | FloatingOffset;
  /** 空间不足时翻转，默认 true */
  flip?: boolean;
  /** 沿交叉轴钳制，默认 true */
  shift?: boolean;
  /** 与边界最小留白，默认 8 */
  padding?: number;
  /** 定位策略，默认 'fixed' */
  strategy?: FloatingStrategy;
}

/** PopoverRoot 的事件声明。 */
export interface PopoverRootEmits {
  'update:open': [value: boolean];
}

/** PopoverTrigger 的组件属性。 */
export interface PopoverTriggerProps {
  as?: string;
  asChild?: boolean;
}

/** PopoverContent 的组件属性。 */
export interface PopoverContentProps {
  /** portal 目标，默认 body */
  container?: string | HTMLElement;
  /** 关闭后仍保留在 DOM（自行处理退场动画时用） */
  forceMount?: boolean;
  /** 打开过一次之后常驻 DOM，关闭只切 data-state 不卸载；首次打开前仍懒挂载，默认 false */
  keepMounted?: boolean;
}

/** PopoverArrow 的组件属性。 */
export interface PopoverArrowProps {
  as?: string;
  asChild?: boolean;
}

/** PopoverClose 的组件属性。 */
export interface PopoverCloseProps {
  as?: string;
  asChild?: boolean;
}
