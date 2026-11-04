/**
 * ScrollAreaRoot 的组件属性。
 *
 * 属性名与默认值对齐 Radix 的 ScrollArea.Root。
 */
export interface ScrollAreaRootProps {
  /**
   * 滚动条出现时机。
   *
   * @default 'hover'
   */
  type?: 'hover' | 'scroll' | 'always' | 'auto';

  /**
   * 停止交互到隐藏之间的延迟（毫秒）。
   *
   * @default 600
   */
  scrollHideDelay?: number;

  /**
   * 文本方向，输出 dir 属性。
   *
   * @default undefined
   */
  dir?: 'ltr' | 'rtl';

  /**
   * thumb 的最小可点中长度（px）。
   *
   * @default 20
   */
  minThumbSize?: number;

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
 * ScrollAreaViewport 的组件属性。
 */
export interface ScrollAreaViewportProps {
  /**
   * 渲染的目标标签名。
   *
   * @default 'div'
   */
  as?: string;
}

/**
 * ScrollAreaScrollbar 的组件属性。
 */
export interface ScrollAreaScrollbarProps {
  /**
   * 滚动条朝向，决定测量哪个维度与 thumb 的位移轴。
   *
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal';

  /**
   * 不可见时也保留该元素，供消费者自己做进出场过渡。
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

/**
 * ScrollAreaThumb 的组件属性。
 */
export interface ScrollAreaThumbProps {
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
 * ScrollAreaCorner 的组件属性。
 */
export interface ScrollAreaCornerProps {
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
