import type { UseCollapsibleReturn } from '@agile-plus/headless';

import type { ComputedRef, Ref } from 'vue';

/**
 * AccordionRoot 的组件属性。
 *
 * `type` 决定值形状（single 是字符串、multiple 是数组），模板上无法按它收窄类型，
 * 因此 `value` 写成联合并在运行期校验，具体形状见文档约定。
 */
export interface AccordionRootProps {
  /** 展开模式，必填：single 至多展开一项，multiple 可同时展开多项 */
  type: 'single' | 'multiple';

  /**
   * 受控值，传入后进入受控模式。
   *
   * @default undefined
   */
  value?: string | string[];

  /**
   * 非受控模式的初始值，形状跟随 type。
   *
   * @default undefined
   */
  defaultValue?: string | string[];

  /**
   * single 模式下是否允许收起唯一展开项。
   *
   * @default false
   */
  collapsible?: boolean;

  /**
   * 整组禁用。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 渲染的目标标签名。
   *
   * @default 'div'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * AccordionRoot 的事件。
 */
export interface AccordionRootEmits {
  /** 值变化时触发，负载形状跟随 type；配合 v-model:value 使用 */
  'update:value': [value: string | string[]];
}

/**
 * AccordionItem 的组件属性。
 *
 * 项没有 open：展开状态唯一来源是组的值，项内部复用受控的 Collapsible。
 */
export interface AccordionItemProps {
  /** 项的值，组内必须唯一 */
  value: string;

  /**
   * 单项禁用；组的禁用状态是「组禁用或项禁用」。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 渲染的目标标签名。
   *
   * @default 'div'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * AccordionTrigger 的组件属性。
 */
export interface AccordionTriggerProps {
  /**
   * 渲染的目标标签名。
   *
   * @default 'button'
   */
  as?: string;

  /**
   * 不渲染按钮，把属性与事件合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * AccordionContent 的组件属性。
 */
export interface AccordionContentProps {
  /**
   * 强制挂载；平时不要开，否则收起的内容会一直留在 DOM 与可访问性树里。
   *
   * @default false
   */
  forceMount?: boolean;

  /**
   * 渲染的目标标签名。
   *
   * @default 'div'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * Item 下发给 Trigger / Content 的上下文。
 *
 * 与 collapsible 上下文分键登记：Accordion 的 Trigger / Content 需要知道所属项的值与
 * 合成禁用态，而这些只有 Item 知道。collapsible 实例本身也在这里转发，Content 直接复用
 * 它的测量与属性表，不再另写一套。
 */
export interface AccordionItemContext {
  /** 项内部复用的 Collapsible 实例（展开态由组值受控驱动） */
  collapsible: UseCollapsibleReturn;

  /** 项的值；用 ComputedRef 保证运行期改名后键盘导航读到新值 */
  itemValue: ComputedRef<string>;

  /** 合成禁用态（组禁用或项禁用） */
  disabled: ComputedRef<boolean>;

  /** 集合 id，由 useId 生成 */
  id: string;

  /** Trigger 元素，键盘导航的焦点落点 */
  triggerElement: Ref<HTMLElement | null>;

  /** 绑定 Trigger 元素，传给模板的 :ref */
  setTriggerElement(node: unknown): void;
}