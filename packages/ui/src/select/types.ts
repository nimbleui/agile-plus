import type { ComputedRef } from 'vue';

import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy, SelectOption } from '@agile-plus/headless';

/**
 * SelectRoot 的组件属性。
 *
 * prop 只接受纯值，响应式由组件内部通过 toRef 交给 Composable；受控布尔属性
 * （open）的缺省必须保持 undefined，被 cast 成 false 会让非受控用法静默失效。
 */
export interface SelectRootProps {
  /** 受控选中值；不传即非受控，空字符串表示清空选择 */
  modelValue?: string;
  /** 非受控初值，默认 ''（未选择） */
  defaultValue?: string;
  /** 受控开合；不传即非受控 */
  open?: boolean;
  /** 非受控开合初值，默认 false */
  defaultOpen?: boolean;
  /** 整体禁用 */
  disabled?: boolean;
  /** 是否必选 */
  required?: boolean;
  /** 表单字段名 */
  name?: string;
  /** 显式归属的表单 id */
  form?: string;
  /** 方向键到边界后是否循环，默认 true */
  loop?: boolean;
  /** typeahead 搜索串重置间隔（毫秒），默认 1000 */
  typeaheadTimeout?: number;
  /** 指向标题元素 id 的 aria-labelledby */
  ariaLabelledby?: string;
  /** 指向说明元素 id 的 aria-describedby */
  ariaDescribedby?: string;
  /** 期望位置，默认 'bottom-start' */
  placement?: FloatingPlacement;
  /** 与触发元素的间距，默认 4 */
  offset?: number | FloatingOffset;
  /** 空间不足时翻转，默认 true */
  flip?: boolean;
  /** 沿交叉轴钳制，默认 true */
  shift?: boolean;
  /** 与边界的最小留白，默认 8 */
  padding?: number;
  /** 定位策略，默认 'absolute'；前提与 fixed 逃生门见 FloatingStrategy */
  strategy?: FloatingStrategy;
}

/** SelectRoot 的事件声明。 */
export interface SelectRootEmits {
  /** 选中值变化，配合 v-model 使用 */
  'update:modelValue': [value: string];
  /** 开合变化，配合 v-model:open 使用 */
  'update:open': [value: boolean];
}

/** SelectTrigger 的组件属性。 */
export interface SelectTriggerProps {
  /** 渲染标签，默认 button */
  as?: string;
  /** 不渲染自身，把属性与事件合并到唯一子元素上 */
  asChild?: boolean;
}

/** SelectValue 的组件属性。 */
export interface SelectValueProps {
  /** 未选择时显示的占位文案；也可以用 placeholder 插槽放富内容 */
  placeholder?: string;
  /** 渲染标签，默认 span */
  as?: string;
  /** 不渲染自身，把属性合并到唯一子元素上 */
  asChild?: boolean;
}

/** SelectIcon 的组件属性。 */
export interface SelectIconProps {
  /** 渲染标签，默认 span */
  as?: string;
  /** 不渲染自身，把属性合并到唯一子元素上 */
  asChild?: boolean;
}

/** SelectContent 的组件属性。 */
export interface SelectContentProps {
  /** portal 目标，默认 body */
  container?: string | HTMLElement;
  /** 打开过一次之后常驻 DOM，关闭只切 data-state 不卸载；首次打开前仍懒挂载，默认 false */
  keepMounted?: boolean;
}

/** SelectViewport 的组件属性。 */
export interface SelectViewportProps {
  /** 渲染标签，默认 div */
  as?: string;
  /** 不渲染自身，把属性合并到唯一子元素上 */
  asChild?: boolean;
}

/** SelectItem 的组件属性。 */
export interface SelectItemProps {
  /** 选项值，同一列表内必须唯一 */
  value: string;
  /** 该选项是否禁用 */
  disabled?: boolean;
  /**
   * 选项的可读文本，用于 typeahead 与触发元素回显。
   *
   * 省略时由 SelectItemText 上报它渲染出的文本；两者都给时以本属性为准，
   * 适合可见内容是富节点、但需要一个干净搜索键的场景。
   */
  textValue?: string;
  /** 渲染标签，默认 div */
  as?: string;
  /** 不渲染自身，把属性合并到唯一子元素上 */
  asChild?: boolean;
}

/** SelectItemText 的组件属性。 */
export interface SelectItemTextProps {
  /** 渲染标签，默认 span */
  as?: string;
  /** 不渲染自身，把属性合并到唯一子元素上 */
  asChild?: boolean;
}

/** SelectItemIndicator 的组件属性。 */
export interface SelectItemIndicatorProps {
  /** 未选中时是否仍保留元素，用于自行处理进出动画 */
  forceMount?: boolean;
  /** 渲染标签，默认 span */
  as?: string;
  /** 不渲染自身，把属性合并到唯一子元素上 */
  asChild?: boolean;
}

/** SelectGroup 的组件属性。 */
export interface SelectGroupProps {
  /** 渲染标签，默认 div */
  as?: string;
  /** 不渲染自身，把属性合并到唯一子元素上 */
  asChild?: boolean;
}

/** SelectLabel 的组件属性。 */
export interface SelectLabelProps {
  /** 渲染标签，默认 div */
  as?: string;
  /** 不渲染自身，把属性合并到唯一子元素上 */
  asChild?: boolean;
}

/** SelectSeparator 的组件属性。 */
export interface SelectSeparatorProps {
  /** 渲染标签，默认 div */
  as?: string;
  /** 不渲染自身，把属性合并到唯一子元素上 */
  asChild?: boolean;
}

/**
 * SelectItem 向内部部件提供的项级上下文。
 *
 * 与列表级上下文分属两层：ItemText 与 Indicator 只关心自己所属的那一个选项，
 * 由 Item 提供，避免它们自行解析 value 再重复实现一遍选中判断。
 */
export interface SelectItemContext {
  /** 所属选项当前是否选中 */
  isSelected: ComputedRef<boolean>;
  /** 上报可读文本；ItemText 挂载与更新时调用 */
  setTextValue(text: string): void;
}

/** SelectGroup 向 Label 提供的上下文：分组标题的元素 id。 */
export interface SelectGroupContext {
  /** 标题 id，组的 aria-labelledby 指向它 */
  labelId: string;
}

/** 成品层选项数据：value 必填，label 缺省时回落到 value。 */
export interface SelectOptionItem {
  /** 选项值 */
  value: string;
  /** 可见文本，缺省用 value */
  label?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/** 转发无头层的选项类型，成品层不必再依赖 headless。 */
export type { SelectOption };
