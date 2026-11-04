import type { CheckboxCheckedState } from '@agile-plus/primitives/checkbox';

/**
 * CheckboxRoot 的组件属性。
 *
 * 属性名对齐 Radix 的 Checkbox.Root；受控值使用三态而不是布尔，
 * 半选是父级根据子项推导出的中间态。
 */
export interface CheckboxRootProps {
  /**
   * 受控选中状态，传入后进入受控模式。
   *
   * @default undefined
   */
  checked?: CheckboxCheckedState;

  /**
   * 非受控模式的初始状态。
   *
   * @default false
   */
  defaultChecked?: CheckboxCheckedState;

  /**
   * 是否禁用，同时落到触发元素的原生 disabled 与隐藏 input。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 是否为必选控件，输出 aria-required 与隐藏 input 的 required。
   *
   * @default false
   */
  required?: boolean;

  /**
   * 表单字段名，对应隐藏 input 的 name。
   *
   * 未提供时 input 不带 name，不再贡献提交值，但仍参与 required 校验；
   * 在 CheckboxGroup 内这一项由组的 name 下发，不要重复声明。
   *
   * @default undefined
   */
  name?: string;

  /**
   * 提交时隐藏 input 携带的值；在 CheckboxGroup 内同时作为「该项在值数组中的标识」。
   *
   * 组内必须显式提供且互不相同，否则多项会落到同一个值上、勾选互相覆盖；
   * 独立使用时可以省略，默认为 `'on'`。
   *
   * @default undefined
   */
  value?: string;

  /**
   * 触发元素 id，供 label 的 for 关联。
   *
   * @default undefined
   */
  id?: string;

  /**
   * 渲染的目标标签名。
   *
   * @default 'button'
   */
  as?: string;

  /**
   * 不渲染按钮本身，把属性与事件合并到唯一的子元素上。
   *
   * 表单用的隐藏 input 由本组件另外渲染，不受替换影响；子元素必须可聚焦，
   * 否则键盘路径退化。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * CheckboxRoot 的事件声明。
 */
export interface CheckboxRootEmits {
  /** 三态状态变化时触发，配合 v-model:checked 使用 */
  'update:checked': [value: CheckboxCheckedState];
}

/**
 * CheckboxIndicator 的组件属性。
 *
 * 命名与挂载语义对齐 Radix 的 Checkbox.Indicator：默认只在选中或半选时存在。
 */
export interface CheckboxIndicatorProps {
  /**
   * 未选中时也保留该元素，便于用 transition 做进出两段动画。
   *
   * @default false
   */
  forceMount?: boolean;

  /**
   * 渲染的目标标签名。
   *
   * @default 'span'
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
 * CheckboxGroupRoot 的组件属性。
 *
 * 语义对齐 Radix Themes 的 CheckboxGroup.Root：组持有值数组，
 * 组内每个 CheckboxRoot 用自己的 value 在数组中取得勾选状态。
 */
export interface CheckboxGroupRootProps {
  /**
   * 受控的选中值集合，传入后进入受控模式。
   *
   * @default undefined
   */
  modelValue?: string[];

  /**
   * 非受控模式的初始选中值集合。
   *
   * @default []
   */
  defaultValue?: string[];

  /**
   * 整组禁用，会传播到组内每一项。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 是否为必选组，只输出 aria-required，不下发给单项。
   *
   * @default false
   */
  required?: boolean;

  /**
   * 表单字段名，组内每一项的隐藏 input 共用它，提交时得到同名多值。
   *
   * @default undefined
   */
  name?: string;

  /**
   * 组标题元素 id，输出 aria-labelledby。
   *
   * @default undefined
   */
  ariaLabelledby?: string;

  /**
   * 组说明元素 id，输出 aria-describedby。
   *
   * @default undefined
   */
  ariaDescribedby?: string;

  /**
   * 渲染的目标标签名。
   *
   * @default 'div'
   */
  as?: string;
}

/**
 * CheckboxGroupRoot 的事件声明。
 */
export interface CheckboxGroupRootEmits {
  /** 值集合变化时触发，配合 v-model 使用 */
  'update:modelValue': [values: string[]];
}
