import type { ComputedRef } from 'vue';

import type { RadioGroupOrientation } from '@agile-plus/headless';

/**
 * RadioGroupRoot 的组件属性。
 *
 * 与 UseRadioGroupOptions 分离的原因同 DialogRootProps：prop 只接受纯值，
 * 响应式由组件内部通过 toRef 交给 Composable。
 */
export interface RadioGroupRootProps {
  /**
   * 受控选中值，传入后进入受控模式。
   *
   * @default undefined
   */
  modelValue?: string;

  /**
   * 非受控模式的初始选中值；允许为空表示「未填写」。
   *
   * @default ''
   */
  defaultValue?: string;

  /**
   * 整组禁用。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 是否为必选组，输出 aria-required。
   *
   * @default false
   */
  required?: boolean;

  /**
   * 键盘导航到边界后是否循环。
   *
   * @default true
   */
  loop?: boolean;

  /**
   * 排列方向，仅用于 aria-orientation 与 data-orientation。
   *
   * @default 'horizontal'
   */
  orientation?: RadioGroupOrientation;

  /**
   * 组标题元素 id，输出 aria-labelledby。
   *
   * 不内置 Label 组件：标题元素由消费者决定，直接关联即可。
   */
  ariaLabelledby?: string;

  /**
   * 组说明元素 id，输出 aria-describedby。
   *
   * @default undefined
   */
  ariaDescribedby?: string;

  /**
   * 表单字段名，对应隐藏 input 的 name。
   *
   * 未提供时不渲染隐藏 input，组件无法参与原生 form 提交。
   *
   * @default undefined
   */
  name?: string;
}

/**
 * RadioGroupRoot 的事件声明。
 */
export interface RadioGroupRootEmits {
  /** 选中值变化时触发，配合 v-model 使用 */
  'update:modelValue': [value: string];
}

/**
 * RadioGroupItem 的组件属性。
 */
export interface RadioGroupItemProps {
  /**
   * 该选项的唯一值，同时用于与 RadioGroupRoot 的 v-model 匹配。
   *
   * 在同一组内必须唯一，重复注册会被忽略。
   */
  value: string;

  /**
   * 该选项是否单独禁用。
   *
   * 整组禁用时无需逐项设置。
   *
   * @default false
   */
  disabled?: boolean;
}

/**
 * RadioGroupItem 向内部组件提供的 item 级上下文。
 *
 * 与组级上下文分属两层：Indicator 只关心自己所属的那一个选项是否选中，
 * 由 Item 提供，避免它自行解析 value 并重复实现一遍选中判断。
 */
export interface RadioGroupItemContext {
  /**
   * 所属选项当前是否选中。
   *
   * 保持响应式：Indicator 的挂载与 data-state 都由它驱动。
   */
  isChecked: ComputedRef<boolean>;
}

/**
 * RadioGroupIndicator 的组件属性。
 *
 * 命名与默认值对齐 Radix 的 RadioGroup.Indicator。
 */
export interface RadioGroupIndicatorProps {
  /**
   * 未选中时是否仍保留该元素。
   *
   * Radix 的 Indicator 默认只在选中时挂载；开启本项后元素常驻，
   * 便于用 transition 做进出两段动画，而不只是入场动画。
   *
   * @default false
   */
  forceMount?: boolean;

  /**
   * 渲染的目标标签名。
   *
   * 与 Flex 同样的约定：只开放原生标签名，替换为组件请走 asChild。
   *
   * @default 'span'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * 子元素必须恰好一个，否则属于开发期用法错误并由 Slot 抛异常。
   *
   * @default false
   */
  asChild?: boolean;
}
