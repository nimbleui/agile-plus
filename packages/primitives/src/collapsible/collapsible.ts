import type {
  CollapsibleContentAttrsInput,
  CollapsibleContentSize,
  CollapsibleDataState,
  CollapsibleStateInput,
  CollapsibleTriggerAttrsInput,
} from './types';

/**
 * 尺寸变量的名字。
 *
 * 与 Radix 的 `--radix-collapsible-content-height/width` 同义，只是换成我们的命名空间。
 * 它们是样式层做高度动画的唯一接口：`@keyframes` 里读不到「元素自然高度」，
 * 必须由测量写进来；写成 px 而不是比例，是因为高度动画的终点是绝对值。
 */
export const COLLAPSIBLE_HEIGHT_VAR = '--y-collapsible-content-height';

/** 宽度变量，语义同上。 */
export const COLLAPSIBLE_WIDTH_VAR = '--y-collapsible-content-width';

/**
 * 折叠区的 `data-state` 取值。
 *
 * @param open 是否展开。
 * @returns 写入 data-state 的字符串。
 */
export function getCollapsibleState(open: boolean): CollapsibleDataState {
  return open ? 'open' : 'closed';
}

/**
 * 根元素的状态属性表。
 *
 * @param input 展开与禁用状态。
 * @returns data-state 与 data-disabled。
 */
export function getCollapsibleRootAttrs(input: CollapsibleStateInput): Record<string, unknown> {
  return getStateAttrs(input);
}

/**
 * 触发按钮的属性表。
 *
 * `aria-controls` 只在展开时输出：收起后 Content 不在 DOM 里，悬空引用比没有更糟。
 * `aria-expanded` 则始终输出布尔值——读屏靠它播报「可展开 / 已展开」，缺省等于没说。
 *
 * @param input 展开、禁用与 Content 的 id。
 * @returns 可直接 v-bind 的属性集合。
 */
export function getCollapsibleTriggerAttrs(
  input: CollapsibleTriggerAttrsInput
): Record<string, unknown> {
  const { open, contentId } = input;

  return {
    type: 'button',
    'aria-expanded': open,
    'aria-controls': open ? contentId : undefined,
    ...getStateAttrs(input),
  };
}

/**
 * Content 的属性表。
 *
 * `hidden` 而不是 `v-if` 决定可见性：Presence 要求元素在退场动画期间留在 DOM 里，
 * 而 `hidden` 既能立刻对读屏与焦点序生效，又不会把节点删掉。children 是否渲染由
 * 组件层另外决定（Radix 同样只在 isOpen 时渲染 children，避免退场期间内容被重新求值）。
 *
 * @param input 展开、禁用、id 与 Presence 状态。
 * @returns id、hidden 与状态属性。
 */
export function getCollapsibleContentAttrs(
  input: CollapsibleContentAttrsInput
): Record<string, unknown> {
  const { contentId, open, isPresent } = input;

  return {
    id: contentId,
    hidden: !(open || isPresent) || undefined,
    ...getStateAttrs(input),
  };
}

/**
 * 把实测尺寸写成 CSS 变量。
 *
 * 为 0 时不写：首帧还没量到，写 `0px` 会让入场动画的终点变成 0，
 * 内容会先塌一下再弹开。缺省值由样式层的 `@keyframes` 自己兜（`to { height: auto }` 不合法，
 * 因此样式层对「没有变量」的情况直接不做高度动画）。
 *
 * @param size 实测尺寸，未测得时为 null。
 * @returns 可直接用于 :style 的样式对象。
 */
export function getCollapsibleContentVars(
  size: CollapsibleContentSize | null
): Record<string, string> {
  if (!size) return {};

  return {
    ...(size.height > 0 ? { [COLLAPSIBLE_HEIGHT_VAR]: `${size.height}px` } : null),
    ...(size.width > 0 ? { [COLLAPSIBLE_WIDTH_VAR]: `${size.width}px` } : null),
  };
}

/**
 * 三个部件共用的状态属性。
 *
 * `data-disabled` 在未禁用时**不输出**而不是输出 false：样式层按「属性存在」写选择器，
 * 写成空串以外的值会让 `[data-disabled]` 命中所有折叠区。
 */
function getStateAttrs(input: CollapsibleStateInput): Record<string, unknown> {
  const { open, disabled = false } = input;

  return {
    'data-state': getCollapsibleState(open),
    'data-disabled': disabled ? '' : undefined,
  };
}
