/**
 * 带样式 Textarea 的组件属性。
 *
 * 显式列出字段而不是 extends 导入类型：Vue SFC 编译器在部分环境下无法解析
 * 跨包导入类型作为 defineProps 基类型。rows / wrap 等原生属性经 attrs 透传。
 */
export interface TextareaProps {
  /** 受控值，配合 `v-model` 使用；缺省 undefined 表示非受控 */
  modelValue?: string;

  /** 非受控模式的初始值，默认 '' */
  defaultValue?: string;

  /** 是否禁用，默认 false */
  disabled?: boolean;

  /** 是否只读，默认 false */
  readOnly?: boolean;

  /** 是否必填，默认 false */
  required?: boolean;

  /** 表单字段名 */
  name?: string;

  /** 控件 id，供 label 的 for 关联 */
  id?: string;

  /** 显式指定所属表单的 id */
  form?: string;

  /** 渲染的目标标签名，默认 'textarea' */
  as?: string;

  /** 把属性合并到唯一的子元素上，默认 false */
  asChild?: boolean;
}