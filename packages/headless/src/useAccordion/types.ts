import type { AccordionType } from '@agile-plus/primitives/accordion';

import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

/**
 * useAccordion 的配置项。
 *
 * 属性名对齐 Radix 的 `Accordion`（Root）：`type` / `value` / `defaultValue` /
 * `collapsible` / `disabled` / `onValueChange`。
 */
export interface UseAccordionOptions {
  /**
   * 展开模式，必填。
   *
   * 缺失时抛错：它决定值形状（string 还是 string[]），猜默认值会静默改变语义。
   */
  type: MaybeRefOrGetter<AccordionType>;

  /**
   * 受控值，传入后进入受控模式。
   *
   * single 是字符串（空串表示一项都不展开），multiple 是字符串数组。
   * `undefined` 是「未受控」的唯一判据。
   */
  value?: MaybeRefOrGetter<string | string[] | undefined>;

  /** 非受控模式的初始值，形状与 `value` 相同 */
  defaultValue?: MaybeRefOrGetter<string | string[] | undefined>;

  /**
   * single 模式下是否允许收起唯一展开项，默认 false。
   *
   * false 时始终保留一项展开（点击已展开项不收起）；true 时允许全部收起。
   * multiple 模式忽略此值。
   */
  collapsible?: MaybeRefOrGetter<boolean | undefined>;

  /** 整组禁用，项级禁用由「组禁用或项禁用」合成 */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /** 值变化回调，负载形状跟随 type：single 给字符串，multiple 给数组 */
  onValueChange?: (value: string | string[]) => void;
}

/**
 * 登记进键盘导航集合的一个项。
 *
 * 保存 Ref 而不是快照：项可能随时被禁用，键盘导航发生时必须读到当下的状态与真实元素。
 * element 是该项的 Trigger 按钮（焦点落点），不是 Item 容器。
 */
export interface AccordionItemEntry {
  /** 集合 id，由项用 useId 生成；与展开值无关，值允许为空 */
  id: string;

  /** 该项的展开值 */
  value: string;

  /** Trigger 元素，未挂载时为 null */
  element: Ref<HTMLElement | null>;

  /** 是否禁用（组禁用或项禁用合成），禁用项不参与箭头导航 */
  disabled: ComputedRef<boolean>;
}

/**
 * useAccordion 的返回值。
 */
export interface UseAccordionReturn {
  /** 展开模式 */
  type: ComputedRef<AccordionType>;

  /** 当前展开值集合（内部统一数组） */
  value: ComputedRef<string[]>;

  /** 整组是否禁用 */
  disabled: ComputedRef<boolean>;

  /** single 模式是否允许全部收起 */
  collapsible: ComputedRef<boolean>;

  /**
   * 判断某项是否展开。
   *
   * @param itemValue 项的值。
   * @returns 是否展开。
   */
  isItemOpen(itemValue: string): boolean;

  /**
   * 写入某项的展开状态，转移规则由 primitives/accordion 决定。
   *
   * @param itemValue 项的值。
   * @param open 该项的目标展开状态。
   */
  setItemOpen(itemValue: string, open: boolean): void;

  /**
   * 登记一个参与键盘导航的项。
   *
   * @param entry 项条目。
   * @returns 注销函数。
   */
  registerItem(entry: AccordionItemEntry): () => void;

  /** 根元素属性表 */
  getRootAttrs(): Record<string, unknown>;

  /**
   * Trigger 的键盘导航：上下箭头 / Home / End 在可用项之间移动焦点。
   *
   * 只移动焦点，不展开——展开由 Enter / Space / click 触发，原生 button 已处理。
   * 绑定到 Trigger 的 @keydown。
   *
   * @param event 原生键盘事件。
   * @param itemValue 当前 Trigger 所属项的值。
   */
  onTriggerKeydown(event: KeyboardEvent, itemValue: string): void;
}