/**
 * Accordion 的类型与常量。
 *
 * 对齐对象是 radix-ui/primitives 的 `packages/react/accordion/src/accordion.tsx`：
 * Root 管理一组 Item 的展开值，Item 内部复用 Collapsible 的 Trigger / Content。
 * 与 ToggleGroup 共享「single / multiple 集合」的值形状，但展开转移多一个 `collapsible`
 * 闸门，因此值算法独立成域，不复用 toggle 的命名与语义。
 */

/**
 * 展开模式。
 *
 * - `single`：至多展开一项，值是字符串（空串表示一项都不展开）。
 * - `multiple`：可同时展开多项，值是字符串数组。
 */
export type AccordionType = 'single' | 'multiple';

/**
 * 一次展开/收起后的值转移输入。
 */
export interface AccordionValueInput {
  /** 展开模式 */
  type: AccordionType;

  /**
   * single 模式下是否允许把唯一展开项也收起。
   *
   * 仅对 single 生效：`false` 时点击已展开项不收起（始终保留一项展开），
   * `true` 时允许全部收起。multiple 模式忽略此值。
   */
  collapsible: boolean;

  /** 转移前的内部值集合（已归一化为数组） */
  value: string[];

  /** 被操作项的值 */
  itemValue: string;

  /** 该项操作后的目标展开状态 */
  open: boolean;
}

/**
 * 根元素属性表的输入。
 */
export interface AccordionRootAttrsInput {
  /** 整组禁用；禁用态由根下发，项级再合成自身禁用 */
  disabled?: boolean;
}

/**
 * 项元素属性表的输入。
 */
export interface AccordionItemAttrsInput {
  /** 该项是否展开 */
  open: boolean;

  /** 该项是否禁用（组禁用或项禁用合成后的结果） */
  disabled?: boolean;
}