import type { TreeCheckState, TreeItemAttrsInput, TreeRootAttrsInput } from './types';

/**
 * 树根的属性表。
 *
 * `role="tree"` 与 `tabindex="0"` 必须落在**同一个**元素上，且这个元素就是
 * `aria-activedescendant` 的宿主：三处分开写会导致焦点在一个元素上、读屏播报另一个元素，
 * 属性表把这个约束固化在这里而不是交给调用方记住。
 *
 * 没有 `aria-activedescendant` 时不输出该属性而不是输出空串：空串是一个指向不存在元素的 idref，
 * 读屏会报「未命名」而不是「没有活动项」。
 *
 * @param input 多选语义与当前活动行 id。
 * @returns 可直接 v-bind 的属性集合。
 */
export function getTreeRootAttrs(input: TreeRootAttrsInput): Record<string, unknown> {
  return {
    role: 'tree',
    tabindex: 0,
    'aria-multiselectable': input.multiselectable || undefined,
    'aria-activedescendant': input.activeDescendantId,
  };
}

/**
 * 树行的属性表。
 *
 * 虚拟化之后一棵树的 DOM 是平的（没有嵌套的 `role="group"`），层级完全由这三个属性表达：
 * `aria-level` 给深度、`aria-posinset` / `aria-setsize` 给「这一行在兄弟里的位置」。后者必须是
 * **全部兄弟**而不是当前渲染出来的那几行——这正是 `aria-setsize` 的定义，也是读屏在只渲染
 * 十几行时仍能报出「第 3 项，共 12 项」的原因，与 VirtualList 用同一手法。
 *
 * 三个可选属性各自缺省的条件都是语义而不是省事：
 *
 * - `aria-expanded`：叶子没有展开态，输出 `false` 会被读屏念成「可收起」，而它压根没有箭头。
 * - `aria-selected`：`selection="none"` 时这棵树不表达选择，留着属性会让用户以为能选。
 * - `aria-checked`：只在带勾选框时输出，`indeterminate` 映射成三态值 `mixed`。
 *
 * `data-*` 系列是给样式层的稳定钩子：窗口化渲染里 `:last-child`、`:nth-child()` 这类结构选择器
 * 都会随滚动翻面，状态必须由属性而不是位置表达。层级不在这里重复输出——缩进是
 * `aria-level` 之外由渲染层写进 `--y-tree-level` 的一个数字，属性表再给一份就是两个真源。
 *
 * `data-active` 标出 `aria-activedescendant` 当前指向的那一行。它必须存在：单一 tab 停靠点的
 * 设计里 `:focus` 永远落在容器上，行自身不会聚焦，键盘游标若只写在 idref 里就画不出来。
 *
 * @param input 该行的层级、选中、勾选、活动与禁用状态。
 * @returns 可直接 v-bind 的属性集合。
 */
export function getTreeItemAttrs(input: TreeItemAttrsInput): Record<string, unknown> {
  return {
    role: 'treeitem',
    id: input.id,
    'aria-level': input.level + 1,
    'aria-posinset': input.posinset,
    'aria-setsize': input.setsize,
    'aria-expanded': input.branch ? input.expanded : undefined,
    'aria-selected': input.selectable ? input.selected : undefined,
    'aria-checked': input.checked === undefined ? undefined : toAriaChecked(input.checked),
    'aria-disabled': input.disabled ? true : undefined,
    'data-expanded': input.branch && input.expanded ? '' : undefined,
    'data-selected': input.selectable && input.selected ? '' : undefined,
    'data-check-state': input.checked,
    'data-active': input.active ? '' : undefined,
    'data-disabled': input.disabled ? '' : undefined,
  };
}

/**
 * 三态到 `aria-checked` 的映射。
 *
 * `mixed` 是唯一的半选表达；写成 `aria-checked="false"` 加一个 `data` 属性会让读屏报「未勾选」，
 * 而屏幕上是一个减号。
 */
function toAriaChecked(state: TreeCheckState): boolean | 'mixed' {
  if (state === 'checked') return true;
  if (state === 'indeterminate') return 'mixed';

  return false;
}
