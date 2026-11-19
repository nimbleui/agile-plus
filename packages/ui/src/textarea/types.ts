/**
 * Textarea 的组件属性。
 *
 * 与 Input 相比没有 type：textarea 不接受该属性。rows / wrap / maxlength 等
 * 原生属性经 attrs 透传。表单集成语义与 Input 完全一致。
 */
export interface TextareaProps {
  /**
   * 受控值，传入后进入受控模式，配合 `v-model` 使用。
   *
   * @default undefined
   */
  modelValue?: string;

  /**
   * 非受控模式的初始值。
   *
   * @default ''
   */
  defaultValue?: string;

  /**
   * 是否禁用。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 是否只读：值仍可选中复制，与禁用语义不同。
   *
   * @default false
   */
  readOnly?: boolean;

  /**
   * 是否必填，输出 `aria-required` 并参与原生校验。
   *
   * @default false
   */
  required?: boolean;

  /**
   * 表单字段名。在 FormField 内可省略（复用 Field 的 name）。
   *
   * @default undefined
   */
  name?: string;

  /**
   * 控件 id，供 label 的 for 关联。在 FormField 内可省略（复用 Field 生成的 id）。
   *
   * @default undefined
   */
  id?: string;

  /**
   * 显式指定所属表单的 id，用于控件放在 `<form>` 外部的场景。
   *
   * @default undefined
   */
  form?: string;

  /**
   * 渲染的目标标签名。
   *
   * @default 'textarea'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上；子元素应是 textarea 元素。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * Textarea 的事件。
 */
export interface TextareaEmits {
  /** 值变化时触发（IME 组合期间不触发，组合结束后一次性触发），配合 `v-model` 使用 */
  'update:modelValue': [value: string];

  /** 原生 change 语义：失焦确认时触发，携带原始事件 */
  change: [event: Event];
}