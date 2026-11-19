/**
 * Button 的组件属性。
 *
 * 无状态组件：点击语义完全交给原生 button，本层只输出状态钩子。
 * 视觉变体（variant / size）属于样式层，不在无样式层出现。
 */
export interface ButtonProps {
  /**
   * 是否禁用。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 是否加载中。加载期间按禁用处理（原生 disabled + aria-busy），
   * 避免重复提交；视觉反馈由样式层的 spinner 承担。
   *
   * @default false
   */
  loading?: boolean;

  /**
   * 原生 button 的 type。默认 'button'：放进表单时不会意外触发提交，
   * 需要提交行为时显式给 'submit'。
   *
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset';

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