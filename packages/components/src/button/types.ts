/** 外观变体：实心主操作 / 描边次操作 / 虚线 / 文本 / 链接。 */
export type ButtonVariant = 'primary' | 'default' | 'dashed' | 'text' | 'link';

/** 尺寸变体，高度取自全局控件 Token。 */
export type ButtonSize = 'small' | 'middle' | 'large';

/**
 * 带样式 Button 的组件属性。
 *
 * 显式列出字段而不是 extends 导入类型：Vue SFC 编译器在部分环境下无法解析
 * 跨包导入类型作为 defineProps 基类型。
 */
export interface ButtonProps {
  /** 外观变体，默认 'default' */
  variant?: ButtonVariant;

  /** 尺寸变体，默认 'middle' */
  size?: ButtonSize;

  /** 是否禁用，默认 false */
  disabled?: boolean;

  /** 是否加载中；加载期间按禁用处理并显示 spinner，默认 false */
  loading?: boolean;

  /** 原生 button 的 type，默认 'button'（放进表单不会意外提交） */
  type?: 'button' | 'submit' | 'reset';

  /** 渲染的目标标签名，默认 'button' */
  as?: string;

  /** 把属性合并到唯一的子元素上，默认 false；此时 spinner 由消费者自绘 */
  asChild?: boolean;
}