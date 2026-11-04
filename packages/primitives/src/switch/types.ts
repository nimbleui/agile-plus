/**
 * Switch 的类型与常量。
 *
 * 对齐对象是 radix-ui/primitives 的 `packages/react/switch/src/switch.tsx`
 * （main 分支，445 行）：它由 Provider / Trigger / Thumb / BubbleInput 四段组成，
 * 对外只暴露 `Switch`（=Root）与 `Switch.Thumb`。
 */

/**
 * 开关的 `data-state` 词表。
 *
 * Radix 在这里用 `checked` / `unchecked`，而不是 Checkbox 的
 * `checked` / `indeterminate` / `unchecked` 三态，也不是 Dialog 的 `open` / `closed`。
 * 词表是样式层的接口，写错一个值样式就静默失效。
 */
export type SwitchDataState = 'checked' | 'unchecked';

/**
 * 开关属性表的输入。
 */
export interface SwitchAttrsInput {
  /** 是否打开 */
  checked: boolean;

  /** 是否禁用，禁用时输出 data-disabled 与原生 disabled */
  disabled: boolean;

  /** 是否必填，输出 aria-required 与隐藏 input 的 required */
  required: boolean;
}
