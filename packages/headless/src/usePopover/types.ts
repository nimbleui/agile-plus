import type { ComputedRef, MaybeRefOrGetter } from 'vue';

import type {
  FloatingArrowOptions,
  FloatingOffset,
  FloatingPlacement,
} from '@agile-plus/primitives/floating';

import type { FloatingStrategy, UseFloatingReturn } from '../useFloating';

/** usePopover 的配置。 */
export interface UsePopoverOptions {
  /** 受控开合；undefined 表示非受控 */
  open?: MaybeRefOrGetter<boolean | undefined>;
  /** 非受控初值，默认 false */
  defaultOpen?: boolean;
  /** 开合变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 按 Escape 是否关闭，默认 true */
  closeOnEscape?: boolean;
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
  /** 需要箭头时给出尺寸；缺省 { size: 8 }，不渲染 Arrow 部件时无副作用 */
  arrow?: FloatingArrowOptions;
}

/** usePopover 的返回值。 */
export interface UsePopoverReturn {
  /** 是否打开 */
  isOpen: ComputedRef<boolean>;
  /** 打开 */
  open(): void;
  /** 关闭并把焦点交还触发元素（若焦点曾在浮层内） */
  close(): void;
  /** 切换开合 */
  toggle(): void;
  /** 触发元素 id */
  triggerId: string;
  /** 浮层 id */
  contentId: string;
  /** 定位能力 */
  floating: UseFloatingReturn;
  /** 触发元素属性 */
  getTriggerProps(): Record<string, unknown>;
  /** 浮层属性 */
  getContentProps(): Record<string, unknown>;
  /** 关闭按钮属性 */
  getCloseProps(): Record<string, unknown>;
  /** 绑定触发元素 */
  setTriggerElement(node: unknown): void;
  /** 绑定浮层元素 */
  setContentElement(node: unknown): void;
  /** 浮层键盘处理器（Escape 关闭） */
  onContentKeydown(event: KeyboardEvent): void;
}
