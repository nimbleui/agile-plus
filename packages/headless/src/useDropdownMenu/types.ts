import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy, UseFloatingReturn } from '../useFloating';

/** 菜单项注册条目。以消费者语义 value 为键，顺序即导航顺序。 */
export interface DropdownMenuItemEntry {
  /** 消费者语义 value，item-select 回调返回它 */
  value: Ref<string>;
  /** 是否禁用 */
  disabled: Ref<boolean>;
  /** 可读文本（typeahead / 读屏备用） */
  textValue: Ref<string>;
  /** 项元素，用于滚动跟随 */
  element: Ref<HTMLElement | null>;
  /** 项语义：普通 / 可勾选 / 单选 */
  kind: 'item' | 'checkbox' | 'radio';
}

/** useDropdownMenu 的配置。 */
export interface UseDropdownMenuOptions {
  open?: MaybeRefOrGetter<boolean | undefined>;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 选中某项回调（点击或 Enter/Space），返回消费者 value */
  onSelect?: (value: string) => void;
  placement?: FloatingPlacement;
  offset?: number | FloatingOffset;
  flip?: boolean;
  shift?: boolean;
  padding?: number;
  strategy?: FloatingStrategy;
  /** 方向键到边界是否循环，默认 true */
  loop?: boolean;
}

/** useDropdownMenu 的返回值。 */
export interface UseDropdownMenuReturn {
  isOpen: ComputedRef<boolean>;
  open(): void;
  close(): void;
  toggle(): void;
  triggerId: string;
  contentId: string;
  floating: UseFloatingReturn;
  /** 当前高亮项 value */
  highlightedValue: ComputedRef<string | null>;
  registerItem(entry: DropdownMenuItemEntry): () => void;
  getTriggerProps(): Record<string, unknown>;
  getContentProps(): Record<string, unknown>;
  getItemProps(value: string): Record<string, unknown>;
  getLabelProps(): Record<string, unknown>;
  getSeparatorProps(): Record<string, unknown>;
  setTriggerElement(node: unknown): void;
  setContentElement(node: unknown): void;
  onTriggerKeydown(event: KeyboardEvent): void;
  onContentKeydown(event: KeyboardEvent): void;
  onItemPointerMove(value: string): void;
  onItemClick(value: string): void;
}
