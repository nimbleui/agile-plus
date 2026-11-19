/**
 * Input / Textarea 共享的状态属性输入。
 *
 * 两者都是原生约束校验控件，状态词表完全一致：禁用 / 只读 / 必填。
 * 词表是样式层的接口，写错一个值样式就静默失效。
 */
export interface InputAttrsInput {
  /** 是否禁用 */
  disabled: boolean;

  /** 是否只读：值仍可选中复制，与禁用的语义不同 */
  readOnly: boolean;

  /** 是否必填，输出 aria-required 并参与原生校验 */
  required: boolean;
}