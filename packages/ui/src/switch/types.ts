/**
 * SwitchRoot 的组件属性。
 *
 * 表单相关的 `name` / `value` / `form` / `required` 语义与 Radix 的 Switch 一致：
 * 控件在 `<form>` 内（或显式指定 form id）时，会渲染一个覆盖在按钮上的隐藏
 * checkbox input 承接原生提交与校验。
 */
export interface SwitchRootProps {
  /**
   * 受控状态，传入后进入受控模式。
   *
   * @default undefined
   */
  checked?: boolean;

  /**
   * 非受控模式的初始状态。
   *
   * @default false
   */
  defaultChecked?: boolean;

  /**
   * 是否禁用。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 是否必填，输出 `aria-required` 并让隐藏 input 参与原生校验。
   *
   * @default false
   */
  required?: boolean;

  /**
   * 表单字段名。未提供时隐藏 input 不带 name，因此不会被提交，但仍在表单内参与校验。
   *
   * @default undefined
   */
  name?: string;

  /**
   * 提交值。
   *
   * @default 'on'
   */
  value?: string;

  /**
   * 显式指定所属表单的 id，用于控件放在 `<form>` 外部的场景。
   *
   * @default undefined
   */
  form?: string;

  /**
   * 控件 id，供 label 的 for 关联。
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
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * SwitchRoot 的事件。
 */
export interface SwitchRootEmits {
  /** 状态变化时触发，配合 `v-model:checked` 使用 */
  'update:checked': [checked: boolean];
}

/**
 * SwitchThumb 的组件属性。
 *
 * 滑块始终渲染（与 Checkbox 的 Indicator 只在选中时挂载不同），位移由样式层根据
 * 父级 `data-state` 决定；Radix 的 Thumb 同样是常驻元素。
 */
export interface SwitchThumbProps {
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
