/**
 * Collapsible 的类型与常量。
 *
 * 对齐对象是 radix-ui/primitives 的 `packages/react/collapsible/src/collapsible.tsx`：
 * Root / Trigger / Content 三个部件，Content 由 Presence 包裹并自带尺寸测量。
 */

/**
 * 折叠区的 `data-state` 词表。
 *
 * 与 Dialog、Tabs 一致用 `open` / `closed`，不是 Switch 的 `checked` / `unchecked`。
 * 词表是样式层的接口，写错一个值进出场动画就静默失效。
 */
export type CollapsibleDataState = 'open' | 'closed';

/**
 * Collapsible 的状态输入。
 */
export interface CollapsibleStateInput {
  /** 是否展开 */
  open: boolean;

  /**
   * 是否禁用。
   *
   * 禁用只作用于 Trigger 的点击（原生 `disabled`），不阻止程序化打开——
   * 与 Radix 一致：受控用法下外部仍可改 `open`。
   */
  disabled?: boolean;
}

/**
 * Trigger 属性表的输入。
 */
export interface CollapsibleTriggerAttrsInput extends CollapsibleStateInput {
  /**
   * Content 的元素 id。
   *
   * 只在展开时写进 `aria-controls`：收起后目标元素不在 DOM 里，
   * 指着一个不存在的 id 会让读屏报出悬空引用。
   */
  contentId: string;
}

/**
 * Content 属性表的输入。
 */
export interface CollapsibleContentAttrsInput extends CollapsibleStateInput {
  /** 元素 id，与 Trigger 的 aria-controls 同源 */
  contentId: string;

  /**
   * Presence 是否仍要求它留在 DOM 中（退出动画期间为 true）。
   *
   * `hidden` 由「展开或仍在退场」共同决定：退场动画期间元素必须可见，
   * 否则动画连同一帧被 hidden 掉。
   */
  isPresent: boolean;
}

/**
 * Content 的实测尺寸。
 */
export interface CollapsibleContentSize {
  /** 高度，单位像素 */
  height: number;

  /** 宽度，单位像素 */
  width: number;
}
