import type {
  FlexAlign,
  FlexAlignSelf,
  FlexDirection,
  FlexGap,
  FlexJustify,
  FlexWrap,
} from '@agile-plus/primitives/flex';

/**
 * FlexRoot 的组件属性。
 *
 * 布局相关字段与 primitives 的 FlexConfig 取值一致：Flex 没有受控状态，
 * 不存在 MaybeRefOrGetter 与纯值的分离需求，因此仍单独声明而不是直接复用，
 * 让组件边界上的默认值与 `as` / `asChild` 这类纯渲染属性有一处定义。
 */
export interface FlexRootProps {
  /**
   * 主轴方向。
   *
   * 未提供时不输出 data-direction，容器保持 CSS 初始值 row。
   *
   * @default undefined
   */
  direction?: FlexDirection;

  /**
   * 交叉轴对齐，语义值由样式层映射为 flex-start / flex-end 等 CSS 值。
   *
   * 未提供时等同 align-items: stretch。
   *
   * @default undefined
   */
  align?: FlexAlign;

  /**
   * 主轴分布方式。
   *
   * 未提供时等同 justify-content: flex-start。
   *
   * @default undefined
   */
  justify?: FlexJustify;

  /**
   * 换行行为，取值与 CSS flex-wrap 一致，不使用布尔值：
   * wrap-reverse 无法由布尔表达。
   *
   * 未提供时等同 flex-wrap: nowrap。
   *
   * @default undefined
   */
  wrap?: FlexWrap;

  /**
   * 子项间距。
   *
   * 档位值（xs / sm / md / lg / xl）输出 data-gap 由样式层查 Design Token；
   * 其余字符串作为任意 CSS 值写成内联 gap。空字符串按未提供处理。
   *
   * @default undefined
   */
  gap?: FlexGap;

  /**
   * 是否使用 inline-flex 参与行内排版。
   *
   * 为 true 时输出 data-inline，供样式层用存在性选择器命中。
   *
   * @default false
   */
  inline?: boolean;

  /**
   * 渲染的目标标签名，例如 section、nav、ul。
   *
   * 与 Reka 的 Primitive.as 不同，这里只开放原生标签名：替换为组件的场景由
   * asChild 覆盖，两条路径语义不重叠也避免标签与组件两套校验。
   *
   * @default 'div'
   */
  as?: string;

  /**
   * 不渲染自身容器，而把布局属性合并到唯一的子元素上。
   *
   * 子元素必须恰好一个，否则属于开发期用法错误并抛异常；开启时 as 被忽略。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * FlexItem 的组件属性。
 *
 * 覆盖项命名与取值对齐 Ark UI 的 Flex.Item；这些值写成元素自身的内联声明，
 * 优先级高于样式层，未提供的字段不产出声明。
 */
export interface FlexItemProps {
  /**
   * CSS flex 简写原值，例如 '1 1 auto'。
   *
   * 与 grow / shrink / basis 同时提供时，长写声明在其后输出并覆盖简写。
   *
   * @default undefined
   */
  flex?: string;

  /**
   * CSS flex-grow 数值。
   *
   * 未提供时不输出，保持 CSS 初始值 0。
   *
   * @default undefined
   */
  grow?: number;

  /**
   * CSS flex-shrink 数值。
   *
   * 未提供时不输出，保持 CSS 初始值 1。
   *
   * @default undefined
   */
  shrink?: number;

  /**
   * CSS flex-basis 原值，例如 '100px'、'30%'、'content'。
   *
   * @default undefined
   */
  basis?: string;

  /**
   * CSS order 整数，只改变视觉排列，不改变 DOM 顺序与键盘焦点顺序。
   *
   * @default undefined
   */
  order?: number;

  /**
   * 单项自身的交叉轴对齐，auto 表示沿用容器结果。
   *
   * 属于有限枚举，因此输出 data-align-self 交给样式层映射。
   *
   * @default undefined
   */
  alignSelf?: FlexAlignSelf;

  /**
   * 渲染的目标标签名，语义同 FlexRootProps.as。
   *
   * @default 'div'
   */
  as?: string;

  /**
   * 不渲染自身容器，而把覆盖属性合并到唯一的子元素上，语义同 FlexRootProps.asChild。
   *
   * @default false
   */
  asChild?: boolean;
}
