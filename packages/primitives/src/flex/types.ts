/**
 * Flex 原语层类型定义。
 *
 * 本层只做两类纯映射：语义枚举 → 稳定的 data-* 钩子，任意 CSS 值 → 最小内联声明。
 * 不产生任何 CSS 值、不引用 Design Token：`flex-direction`、`gap` 尺寸等具体声明
 * 全部由样式层的属性选择器决定，因此主题或令牌体系调整不会改动本层。
 *
 * 取值与命名对齐 Radix Themes 的 `Flex`（容器）与 Ark UI 的 `Flex.Item`（单项）。
 *
 * 刻意没有状态机：Flex 的状态就是消费者传入的一组静态布局值，DOM 渲染后不再变化，
 * 不存在需要集中约束的合法状态组合，为它建状态机只会增加一层无收益的间接。
 */

/**
 * 主轴方向，取值与 CSS `flex-direction` 完全一致。
 */
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';

/**
 * 交叉轴对齐方式。
 *
 * 使用语义名而非 CSS 原值：`start` / `end` 由样式层映射为 `flex-start` / `flex-end`，
 * 消费方的代码因此不必记住 CSS 的历史命名。
 */
export type FlexAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch';

/**
 * 主轴分布方式，语义名由样式层映射为对应的 `justify-content` 值。
 */
export type FlexJustify = 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';

/**
 * 换行行为，取值与 CSS `flex-wrap` 完全一致。
 */
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

/**
 * `gap` 的语义档位名，与间距 Design Token 一一对应，由样式层负责取值。
 */
export type FlexGapScale = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * `gap` 的完整取值：语义档位，或任意合法 CSS `gap` 值（`'12px'`、`'8px 16px'`、`'calc(2rem - 4px)'`）。
 *
 * `(string & {})` 分支不是为了关掉类型检查：低代码物料在运行时传入的是字符串，
 * 静态层面无法枚举；保留该写法是为了字面量场景仍能得到档位名的自动补全。
 */
export type FlexGap = FlexGapScale | (string & {});

/**
 * 单项自己的交叉轴对齐。
 *
 * `auto` 表示沿用容器的 `align` 结果，即 CSS `align-self` 的初始值。
 */
export type FlexAlignSelf = 'auto' | FlexAlign;

/**
 * Flex 容器的布局配置。
 *
 * 所有字段可选，且未提供的字段不会产出对应属性：元素因此保持 CSS 初始值
 * （`row` / `stretch` / `flex-start` / `nowrap` / `normal` / `flex`），
 * 组件不额外发明一套与 CSS 规范不同的默认值。
 */
export interface FlexConfig {
  /** 主轴方向；未提供时不输出属性，等同 CSS `flex-direction: row` */
  direction?: FlexDirection;

  /** 交叉轴对齐；未提供时不输出属性，等同 CSS `align-items: stretch` */
  align?: FlexAlign;

  /** 主轴分布；未提供时不输出属性，等同 CSS `justify-content: flex-start` */
  justify?: FlexJustify;

  /** 换行行为；未提供时不输出属性，等同 CSS `flex-wrap: nowrap` */
  wrap?: FlexWrap;

  /** 子项间距；档位输出 `data-gap` 交由样式层查 Token，任意 CSS 值输出内联声明 */
  gap?: FlexGap;

  /** 是否使用 `inline-flex`；未提供或 `false` 时不输出属性，容器为 `flex` */
  inline?: boolean;
}

/**
 * Flex 单项的布局覆盖配置。
 *
 * 全部可选；这些值会写成元素自身的内联声明（`alignSelf` 除外），
 * 因此优先级高于样式层的类选择器，属于「消费者显式指定」的通道。
 */
export interface FlexItemConfig {
  /** CSS `flex` 简写原值，如 `'1 1 auto'`；与 grow / shrink / basis 同时提供时，后者的长写声明覆盖简写 */
  flex?: string;

  /** CSS `flex-grow`；类型为 number，但任意值字符串同样会原样写入声明 */
  grow?: number;

  /** CSS `flex-shrink`；同 grow，不传时不输出，保持 CSS 初始值 1 */
  shrink?: number;

  /** CSS `flex-basis` 原值，如 `'100px'`、`'30%'`、`'content'` */
  basis?: string;

  /** CSS `order` 整数；只改变视觉排列，不影响 DOM 顺序与键盘焦点顺序 */
  order?: number;

  /** 单项交叉轴对齐；枚举值输出 `data-align-self`，由样式层映射为 CSS */
  alignSelf?: FlexAlignSelf;
}

/**
 * 容器需要绑定的 data-* 布局钩子。
 *
 * 键固定、值只可能是已校验的枚举字符串或空字符串（`data-inline` 为 presence 属性），
 * 因此可以安全地整体 `v-bind`。
 */
export type FlexDataAttrs = Partial<
  Record<
    'data-direction' | 'data-align' | 'data-justify' | 'data-wrap' | 'data-gap' | 'data-inline',
    string
  >
>;

/**
 * 容器需要绑定的内联声明，仅在消费者传入任意 `gap` 值时产出 `gap` 键。
 */
export type FlexStyles = Partial<Record<'gap', string>>;

/**
 * 单项需要绑定的 data-* 布局钩子。
 */
export type FlexItemDataAttrs = Partial<Record<'data-align-self', string>>;

/**
 * 单项需要绑定的内联声明，键的声明顺序即输出顺序，`flex` 简写必须最先写入。
 */
export type FlexItemStyles = Partial<
  Record<'flex' | 'flex-grow' | 'flex-shrink' | 'flex-basis' | 'order', string>
>;
