/**
 * Checkbox 原语层类型定义。
 *
 * 本层只做三态到 ARIA / data-* 的纯映射，不产生任何 CSS 值、不引用 Design Token，
 * 也不持有状态：外观由样式层的属性选择器决定，状态归属在适配层。
 *
 * 取值与语义对齐 Radix 的 Checkbox.Root / Checkbox.Indicator。
 *
 * 刻意没有状态机：Checkbox 的状态只有一个三态选中值，点击之外的交互都由消费者驱动，
 * 不存在需要集中约束的合法状态组合。
 */

/**
 * 选中状态。
 *
 * `'indeterminate'` 表示半选，用于「子项部分选中」的父级复选框：它在视觉上既不是勾也不是空框，
 * 且按 Radix 语义，用户点击半选状态时结果是**选中**而不是取消——半选不是用户可以主动选择的
 * 终态，而是父级根据子项推导出的中间态。
 */
export type CheckboxCheckedState = boolean | 'indeterminate';

/**
 * `data-state` 的取值词表，与样式层 `.y-checkbox[data-state='*']` 选择器一一对应。
 */
export type CheckboxDataState = 'checked' | 'unchecked' | 'indeterminate';

/**
 * `aria-checked` 的取值词表。
 *
 * 半选必须用 `mixed`：辅助技术据此播报「部分选中」，写成 `false` 会让用户以为父级未选中。
 */
export type CheckboxAriaChecked = 'true' | 'false' | 'mixed';

/**
 * 计算属性所需的输入。
 */
export interface CheckboxConfig {
  /**
   * 当前选中状态。
   *
   * 必填：三态中任何一态都会产出对应的属性，本层不对「未设置」做默认值兜底，
   * 由适配层保证传入的是真实状态。
   */
  checked: CheckboxCheckedState;

  /**
   * 是否禁用。
   *
   * 为 true 时才产出 `data-disabled`，未提供与显式 false 都不产出属性，
   * 让样式层能区分「没有该状态」与「显式为非禁用」。
   *
   * @default undefined
   */
  disabled?: boolean;

  /**
   * 是否为必选控件，只影响 `aria-required`：原生 `required` 落在隐藏 input 上，
   * 由适配层负责，不属于本层职责。
   *
   * @default undefined
   */
  required?: boolean;
}

/**
 * 需要绑定到 checkbox 触发元素上的属性集合。
 *
 * 键名与值都已转成 DOM attribute 的字符串形式，可直接 v-bind，
 * 不需要适配层再做布尔到字符串的转换。
 */
export interface CheckboxAttrs {
  /** 当前状态的无障碍表达，半选为 `mixed` */
  'aria-checked': CheckboxAriaChecked;

  /** 当前状态的外观钩子 */
  'data-state': CheckboxDataState;

  /**
   * 必选标记，仅在 required 为 true 时存在。
   */
  'aria-required'?: 'true';

  /**
   * 禁用标记，仅在 disabled 为 true 时存在；空字符串表示「只看存在性」的属性。
   */
  'data-disabled'?: '';
}
