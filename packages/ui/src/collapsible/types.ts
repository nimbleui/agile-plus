/**
 * CollapsibleRoot 的组件属性。
 *
 * 属性名对齐 Radix 的 `Collapsible`（Root）。
 */
export interface CollapsibleRootProps {
  /**
   * 受控展开状态，传入后进入受控模式。
   *
   * @default undefined
   */
  open?: boolean;

  /**
   * 非受控模式下的初始展开状态。
   *
   * @default false
   */
  defaultOpen?: boolean;

  /**
   * 是否禁用，只挡住 Trigger 的点击。
   *
   * @default false
   */
  disabled?: boolean;

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
 * CollapsibleRoot 的事件声明。
 */
export interface CollapsibleRootEmits {
  /** 展开状态变化时触发，配合 v-model:open 使用 */
  'update:open': [value: boolean];
}

/**
 * CollapsibleTrigger 的组件属性。
 */
export interface CollapsibleTriggerProps {
  /**
   * 渲染的目标标签名。
   *
   * @default 'button'
   */
  as?: string;

  /**
   * 不渲染按钮，把属性与事件合并到唯一的子元素上。
   *
   * 子元素必须可聚焦，否则键盘用户到不了这个开关。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * CollapsibleContent 的组件属性。
 */
export interface CollapsibleContentProps {
  /**
   * 强制挂载。
   *
   * 需要更精细的动画控制（或内容必须在收起时仍可被脚本读取）时打开；
   * 平时不要开，否则收起的内容会一直留在 DOM 与可访问性树里。
   *
   * @default false
   */
  forceMount?: boolean;

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
