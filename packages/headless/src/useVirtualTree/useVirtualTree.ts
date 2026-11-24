import { computed, toRef, toValue, useId } from 'vue';

import {
  buildTreeIndex,
  findTreeRowIndex,
  flattenTreeRows,
  getTreeItemAttrs,
  getTreeRootAttrs,
  resolveTreeCheckStates,
  resolveTreeKeyIntent,
  resolveTreeNavigation,
  toggleTreeCheckedKeys,
  toggleTreeKey,
} from '@agile-plus/primitives/tree';

import { useControllable } from '../utils/useControllable';
import { useVirtualList } from '../useVirtualList/useVirtualList';

import type { TreeDataNode, TreeKey, TreeRow } from '@agile-plus/primitives/tree';

import type { UseVirtualTreeOptions, UseVirtualTreeReturn } from './types';

/** 行内插槽允许放原生控件；它们的按键不应被树的导航处理器再次解释。 */
const INTERACTIVE_SELECTOR =
  'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"]), [role="button"], [role="checkbox"]';

/**
 * 虚拟树形控件的 Vue Composable 适配。
 *
 * 组合而不是重写虚拟化：`data → 索引 → 展开后的可见行` 这一段是树独有的，行序列一旦算出来，
 * 剩下的「按累计高度取窗口」与扁平列表是同一个问题，因此直接把 `rows.length` 交给
 * useVirtualList，不复制它的树、测量与滚动补偿。
 *
 * 本层持有的状态：
 *
 * 1. 展开 / 选中 / 勾选 / 活动行四条通道，各自归一化成受控或非受控；
 * 2. 勾选态由子节点回读，`checkedKeys` 只存级联后的最小集合，半选不落地；
 * 3. 活动行记键不记下标——展开收起会在中间插入或删除整段行，下标会指到另一行上。
 *
 * 高度缓存按 `row.key` 记账：展开收起只重排当前可见行，同一个节点的实测高度不会转移到另一个
 * 节点。折叠后暂时离开当前集合的测量会被释放，再次展开时按预估高度重新收敛。
 *
 * @param options 数据、字段名、四条状态通道与虚拟窗口参数。
 * @returns 可见行、窗口几何、状态读写、键盘导航与属性绑定函数集合。
 */
export function useVirtualTree<T extends TreeDataNode>(
  options: UseVirtualTreeOptions<T>
): UseVirtualTreeReturn<T> {
  /**
   * 实例级 id 前缀。
   *
   * 与 Tabs、RadioGroup 同样的原因：id 只由行下标拼成会让同页两棵树的
   * `aria-activedescendant` 指向另一棵树的行。
   */
  const uid = useId();

  /**
   * 键到节点的索引。
   *
   * 每次读取都重算的话，键盘导航、勾选回读、属性表三处各要遍历一遍全部节点；索引一次构建
   * 之后它们都只是查表。数据引用没变就不重建，因此异步加载某一层要传新数组。
   */
  const index = computed(() =>
    buildTreeIndex(toValue(options.data) ?? [], toValue(options.fields))
  );

  const expandedState = useControllable<readonly TreeKey[]>({
    value: options.expandedKeys,
    defaultValue: options.defaultExpandedKeys ?? [],
    onChange: (next) => options.onExpandedKeysChange?.([...next]),
  });

  const selectedState = useControllable<readonly TreeKey[]>({
    value: options.selectedKeys,
    defaultValue: options.defaultSelectedKeys ?? [],
    onChange: (next) => options.onSelectedKeysChange?.([...next]),
  });

  const checkedState = useControllable<readonly TreeKey[]>({
    value: options.checkedKeys,
    defaultValue: options.defaultCheckedKeys ?? [],
    onChange: (next) => options.onCheckedKeysChange?.([...next]),
  });

  const activeState = useControllable<TreeKey | null>({
    value: options.activeKey,
    defaultValue: options.defaultActiveKey ?? null,
    onChange: options.onActiveKeyChange,
  });

  const expandedKeys = computed(() => expandedState.value.value);
  const selectedKeys = computed(() => selectedState.value.value);
  const checkedKeys = computed(() => checkedState.value.value);
  const activeKey = computed(() => activeState.value.value);

  /** 展开之后的可见行：虚拟列表的项序列，也是键盘导航的行序列。 */
  const rows = computed(() => flattenTreeRows(index.value, expandedKeys.value));

  const virtual = useVirtualList({
    count: toRef(() => rows.value.length),
    getItemKey: (index) => rows.value[index]?.key ?? index,
    estimateSize: toRef(() => toValue(options.estimateSize)),
    overscan: toRef(() => toValue(options.overscan)),
  });

  const selectionMode = computed(() => toValue(options.selection) ?? 'single');

  const isCheckable = computed(() => toValue(options.checkable) === true);

  const checkStates = computed(() => resolveTreeCheckStates(index.value, checkedKeys.value));

  const activeIndex = computed(() => findTreeRowIndex(rows.value, activeKey.value));

  /**
   * 当前窗口内的行。
   *
   * 在下标越界时跳过而不是抛出：展开收起的同一 tick 里 `rows` 已经变短而窗口还是旧区间，
   * 下一帧就会收敛，为这一帧的中间态报错没有意义。
   */
  const visibleRows = computed(() => {
    const all = rows.value;
    const rendered: TreeRow<T>[] = [];

    for (const position of virtual.visibleIndices.value) {
      const row = all[position];

      if (row !== undefined) rendered.push(row);
    }

    return rendered;
  });

  function getItemId(row: TreeRow<T>): string {
    return `tree-${uid}-item-${row.index}`;
  }

  function expand(key: TreeKey): void {
    const node = index.value.nodes.get(key);

    if (!node || !node.branch || expandedKeys.value.includes(key)) return;

    expandedState.set([...expandedKeys.value, key]);
  }

  function collapse(key: TreeKey): void {
    if (!expandedKeys.value.includes(key)) return;

    expandedState.set(expandedKeys.value.filter((item) => item !== key));
  }

  function toggleExpand(row: TreeRow<T>): void {
    if (!row.branch || row.disabled) return;

    const nextExpanded = !expandedKeys.value.includes(row.key);

    expandedState.set(toggleTreeKey(expandedKeys.value, row.key, nextExpanded));
  }

  /**
   * 展开全部。
   *
   * 一次写入而不是逐行 `expand`：后者会让行序列在每次展开后重算一遍，十万节点的树点一次
   * 「全部展开」就是十万次 flatten。
   */
  function expandAll(): void {
    const next: TreeKey[] = [];

    // 按 order（前序）而不是按 Map 的插入顺序收集：索引先登记全部顶层再下探，
    // 前序才与行序列同序，emit 出去的展开键集合才有稳定可读的形态。
    for (const key of index.value.order) {
      if (index.value.nodes.get(key)?.branch) next.push(key);
    }

    expandedState.set(next);
  }

  function collapseAll(): void {
    expandedState.set([]);
  }

  function selectRow(row: TreeRow<T>): void {
    if (row.disabled || selectionMode.value === 'none') return;

    const selected = selectedKeys.value.includes(row.key);

    // 单选模式重复点击不取消：没有选中项的树在「点一行看详情」的场景里不是用户想要的状态，
    // 清空另有 clearSelection。
    if (selectionMode.value === 'single') {
      if (!selected) selectedState.set([row.key]);

      return;
    }

    selectedState.set(toggleTreeKey(selectedKeys.value, row.key, !selected));
  }

  function clearSelection(): void {
    if (selectedKeys.value.length === 0) return;

    selectedState.set([]);
  }

  /**
   * 切换勾选并级联。
   *
   * 半选行按下去变成全选：`indeterminate` 是「下面有选中的东西」而不是「可以再点掉一半」，
   * 从半选点成取消会让用户无法用一次点击得到整棵子树全选。
   */
  function toggleCheck(row: TreeRow<T>): void {
    if (!isCheckable.value || row.disabled) return;

    const state = checkStates.value.get(row.key) ?? 'unchecked';

    checkedState.set(
      toggleTreeCheckedKeys(index.value, checkedKeys.value, row.key, state !== 'checked')
    );
  }

  function scrollToKey(key: TreeKey): void {
    const position = findTreeRowIndex(rows.value, key);

    if (position < 0) return;

    virtual.scrollIntoView(position);
  }

  /**
   * 设置活动行。
   *
   * 目标行存在时顺手带进视口：`aria-activedescendant` 指向一行不可见的元素，读屏会照常播报
   * 而屏幕上什么都没有，用户只能靠方向键盲走。已经在视口内时不动。
   */
  function setActiveKey(key: TreeKey | null): void {
    activeState.set(key);

    if (key !== null) scrollToKey(key);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;

    const eventTarget = event.target;

    if (eventTarget instanceof Element && eventTarget.closest(INTERACTIVE_SELECTOR)) return;

    const intent = resolveTreeKeyIntent({
      key: event.key,
      hasModifierKey: event.ctrlKey || event.metaKey || event.altKey,
    });

    const result = resolveTreeNavigation({
      intent,
      rows: rows.value,
      activeIndex: activeIndex.value,
    });

    if (!result.handled) return;

    event.preventDefault();

    // 先改展开再取目标行：导航结果的行下标相对的是当前行序列，而展开/收起只在活动行**之后**
    // 插入或删除行，活动行自身的下标在其中不变，所以两个顺序都能取到同一行。
    if (result.expandKey !== null) expand(result.expandKey);
    if (result.collapseKey !== null) collapse(result.collapseKey);

    const target = result.activeIndex >= 0 ? rows.value[result.activeIndex] : undefined;

    if (target === undefined) return;

    setActiveKey(target.key);

    if (intent.kind !== 'select') return;

    // Enter 与空格分开：Enter 选中当前行，Space 在勾选模式下切换勾选，两条通道都能独立用键盘操作。
    if (event.key === ' ' && isCheckable.value) toggleCheck(target);
    else selectRow(target);
  }

  function getRootAttrs(): Record<string, unknown> {
    const position = activeIndex.value;

    // 活动行必须落在**当前渲染窗口**里才输出 idref：`aria-activedescendant` 指向一个不在 DOM
    // 里的 id 是无效引用，读屏会播报「未命名」而不是「这一行滚出去了」。
    const target =
      position >= virtual.startIndex.value && position <= virtual.endIndex.value
        ? rows.value[position]
        : undefined;

    return getTreeRootAttrs({
      multiselectable: selectionMode.value === 'multiple',
      activeDescendantId: target === undefined ? undefined : getItemId(target),
    });
  }

  function getItemAttrs(row: TreeRow<T>): Record<string, unknown> {
    return getTreeItemAttrs({
      id: getItemId(row),
      level: row.level,
      posinset: row.posinset,
      setsize: row.setsize,
      branch: row.branch,
      expanded: row.expanded,
      selectable: selectionMode.value !== 'none',
      selected: selectedKeys.value.includes(row.key),
      checked: isCheckable.value ? checkStates.value.get(row.key) : undefined,
      active: row.index === activeIndex.value,
      disabled: row.disabled,
    });
  }

  return {
    rows,
    visibleRows,
    expandedKeys,
    selectedKeys,
    checkedKeys,
    checkStates,
    activeKey,
    activeIndex,
    paddingTop: virtual.paddingTop,
    paddingBottom: virtual.paddingBottom,
    totalSize: virtual.totalSize,
    scrollTop: virtual.scrollTop,
    viewportSize: virtual.viewportSize,
    setViewportElement: virtual.setViewportElement,
    setContentElement: virtual.setContentElement,
    invalidateMeasurements: virtual.invalidateMeasurements,
    expand,
    collapse,
    toggleExpand,
    expandAll,
    collapseAll,
    selectRow,
    clearSelection,
    toggleCheck,
    setActiveKey,
    scrollToKey,
    onKeydown,
    getRootAttrs,
    getItemAttrs,
  };
}
