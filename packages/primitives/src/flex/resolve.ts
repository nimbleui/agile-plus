import type {
  FlexConfig,
  FlexDataAttrs,
  FlexGap,
  FlexGapScale,
  FlexItemConfig,
  FlexItemDataAttrs,
  FlexItemStyles,
  FlexStyles,
} from './types';

/**
 * `gap` 语义档位白名单，成员与样式层 `.y-flex[data-gap='*']` 选择器一一对应。
 *
 * 本层不写 Token 名：档位到 `--y-padding-*` 的映射属于样式层职责。新增档位时
 * 必须同时改这里和样式表，只改一侧会得到「属性存在但没有任何声明」的静默失效。
 */
export const FLEX_GAP_SCALES = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
] as const satisfies readonly FlexGapScale[];

/**
 * 判断 `gap` 取值是否为语义档位，决定它走 `data-gap`（样式层查 Token）还是内联声明（任意值直接落到元素）。
 *
 * @param value 消费者传入的 gap 原始值，允许是运行时字符串。
 * @returns 属于档位白名单时为 true。
 */
export function isFlexGapScale(value: FlexGap): value is FlexGapScale {
  // 协变放宽：FlexGapScale 是 FlexGap 的子集，断言只用于让 includes 的参数类型可接受，
  // 不做反向收窄，也不隐藏任何真实的类型不匹配。
  return (FLEX_GAP_SCALES as readonly FlexGap[]).includes(value);
}

/**
 * 计算 Flex 容器需要绑定的 data-* 布局钩子。
 *
 * 未提供的字段一律不产出键，而不是补默认值：属性缺失时浏览器保持 CSS 初始值，
 * 样式层也因此能区分「没有设置」与「显式设置为 nowrap」这两种不同意图。
 * 非枚举字符串（例如低代码物料传入的未知值）会原样写成属性，但样式层没有对应声明，
 * 结果等同于未设置，因此不需要额外的运行时白名单校验。
 *
 * @param config 容器布局配置。
 * @returns 可整体 v-bind 的属性对象。
 */
export function getFlexAttrs(config: FlexConfig): FlexDataAttrs {
  const { direction, align, justify, wrap, gap, inline } = config;

  const attrs: FlexDataAttrs = {};

  if (direction !== undefined) {
    attrs['data-direction'] = direction;
  }

  if (align !== undefined) {
    attrs['data-align'] = align;
  }

  if (justify !== undefined) {
    attrs['data-justify'] = justify;
  }

  if (wrap !== undefined) {
    attrs['data-wrap'] = wrap;
  }

  if (gap !== undefined && isFlexGapScale(gap)) {
    attrs['data-gap'] = gap;
  }

  // 空字符串让 Vue 渲染成 `data-inline`（无值属性），供样式层用存在性选择器命中。
  if (inline === true) {
    attrs['data-inline'] = '';
  }

  return attrs;
}

/**
 * 计算 Flex 容器的内联声明。
 *
 * 只有非档位的任意 `gap` 值需要走这里：它无法被有限的属性选择器枚举，
 * 由浏览器直接解析；其余布局值都不产出声明，避免覆盖样式层的主题能力。
 *
 * @param config 容器布局配置。
 * @returns 可绑定到 `:style` 的对象，无任意值时为空对象。
 */
export function getFlexStyles(config: FlexConfig): FlexStyles {
  const { gap } = config;

  // 空串按「未提供」处理：写进 style 会生成 `gap:` 这类非法声明。
  if (gap === undefined || gap === '' || isFlexGapScale(gap)) {
    return {};
  }

  return { gap };
}

/**
 * 计算 Flex 单项需要绑定的 data-* 布局钩子。
 *
 * @param config 单项布局覆盖配置。
 * @returns 只可能包含 `data-align-self` 的属性对象。
 */
export function getFlexItemAttrs(config: FlexItemConfig): FlexItemDataAttrs {
  const { alignSelf } = config;

  if (alignSelf === undefined) {
    return {};
  }

  return { 'data-align-self': alignSelf };
}

/**
 * 计算 Flex 单项的内联声明。
 *
 * 键的写入顺序即最终 CSS 顺序：`flex` 简写先写，grow / shrink / basis 长写随后覆盖它，
 * 与手写 CSS 的行为一致。数值直接 `String()` 转换而不做白名单校验：合法数字与数字字符串
 * 都能正常解析，无法解析的值由浏览器判为无效声明并单独丢弃，不会影响其他属性。
 *
 * @param config 单项布局覆盖配置。
 * @returns 可绑定到 `:style` 的对象，未提供任何覆盖时为空对象。
 */
export function getFlexItemStyles(config: FlexItemConfig): FlexItemStyles {
  const { flex, grow, shrink, basis, order } = config;

  const styles: FlexItemStyles = {};

  if (flex !== undefined && flex !== '') {
    styles.flex = flex;
  }

  if (grow !== undefined) {
    styles['flex-grow'] = String(grow);
  }

  if (shrink !== undefined) {
    styles['flex-shrink'] = String(shrink);
  }

  if (basis !== undefined && basis !== '') {
    styles['flex-basis'] = basis;
  }

  if (order !== undefined) {
    styles.order = String(order);
  }

  return styles;
}
