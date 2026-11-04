import type { CustomMatcher, ValidityMatcher } from '@agile-plus/primitives/form';

/**
 * FormRoot 的组件属性。
 *
 * 属性名对齐 Radix 的 `Form`（即 `Form.Root`）。表单本身不需要受控/非受控：它不持有
 * 值，只持有「各字段的校验结果」这份内部注册表。
 */
export interface FormRootProps {
  /**
   * 服务端错误需要被清除时的回调。
   *
   * 表单提交或 reset 时触发。校验结果由服务端持有的场景（Next/Nest 风格的重定向表单）
   * 才需要它：组件只知道某个字段被标记为无效，不知道错误内容，因此清除动作必须回到
   * 持有数据的那一侧。
   *
   * @default undefined
   */
  onClearServerErrors?: () => void;

  /**
   * 渲染的目标标签名。
   *
   * @default 'form'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性与事件合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * FormField 的组件属性。
 */
export interface FormFieldProps {
  /**
   * 字段名，同时是原生控件的 `name`。
   *
   * 它是校验注册表的键：Label、Control、Message 靠它对齐到同一份结果，
   * 同一个表单内不能重复。
   */
  name: string;

  /**
   * 服务端判定该字段无效。
   *
   * 打开后 `data-invalid` 生效、控件带 `aria-invalid`；组件不保存服务端错误内容，
   * 文案由消费者渲染（通常是一条不传 `match` 的 Message）。
   *
   * @default false
   */
  serverInvalid?: boolean;

  /**
   * 控件元素 id。
   *
   * 不提供时自动生成，Label 的 `for` 与 Control 的 `id` 都取它。
   *
   * @default undefined
   */
  id?: string;

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
 * FormFieldLabel 的组件属性。
 */
export interface FormFieldLabelProps {
  /**
   * 归属的字段名。
   *
   * 在 FormField 内可省略；脱离 Field 时必须给，否则没有可读取的校验状态。
   *
   * @default undefined
   */
  name?: string;

  /**
   * 指向的控件 id。
   *
   * 在 FormField 内可省略（自动取 Field 的 id）；脱离 Field 时必须给，
   * 否则 `for` 无处可指。
   *
   * @default undefined
   */
  htmlFor?: string;

  /**
   * 渲染的目标标签名。
   *
   * @default 'label'
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
 * FormFieldControl 的组件属性。
 */
export interface FormFieldControlProps {
  /**
   * 字段名。
   *
   * 在 FormField 内可省略；脱离 Field 时必须给。
   *
   * @default undefined
   */
  name?: string;

  /**
   * 控件元素 id。
   *
   * 在 FormField 内可省略（复用 Field 的 id，与 Label 的 `for` 同源）。
   *
   * @default undefined
   */
  id?: string;

  /**
   * 渲染的目标标签名。
   *
   * 必须是带约束校验 API 的元素：`input`、`textarea`、`select`。
   *
   * @default 'input'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性与事件合并到唯一的子元素上。
   *
   * 子元素必须是有 `validity` 的表单控件，否则校验读不到任何东西。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * FormFieldMessage 的组件属性。
 */
export interface FormFieldMessageProps {
  /**
   * 命中的条件。
   *
   * - 不传：只要渲染就显示，用于服务端错误等与原生状态无关的文案。
   * - 字符串：命中对应的内置校验状态，例如 `valueMissing`、`typeMismatch`。
   * - 函数：自定义匹配，收到当前值与整份 `FormData`，可返回 Promise。
   *
   * @default undefined
   */
  match?: ValidityMatcher | CustomMatcher;

  /**
   * 无条件命中。
   *
   * 只用于「文案需要常驻 DOM 才能做进出场动画」的场景，平时不要用。
   *
   * @default false
   */
  forceMatch?: boolean;

  /**
   * 归属的字段名。
   *
   * 在 FormField 内可省略；脱离 Field 时必须给。
   *
   * @default undefined
   */
  name?: string;

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
 * FormFieldValidityState 的组件属性。
 */
export interface FormFieldValidityStateProps {
  /**
   * 归属的字段名。
   *
   * 在 FormField 内可省略；脱离 Field 时必须给。
   *
   * @default undefined
   */
  name?: string;
}

/**
 * FormSubmit 的组件属性。
 */
export interface FormSubmitProps {
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
