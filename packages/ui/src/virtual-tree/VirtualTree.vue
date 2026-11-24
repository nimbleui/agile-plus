<script setup lang="ts" generic="T extends TreeDataNode = TreeDataNode">
import { computed, toRef, useAttrs } from 'vue';

import { useVirtualTree } from '@agile-plus/headless';

import type { TreeCheckState, TreeDataNode, TreeRow } from '@agile-plus/primitives/tree';

import type { UseVirtualTreeReturn } from '@agile-plus/headless';

import type {
  VirtualTreeCheckboxSlotProps,
  VirtualTreeEmits,
  VirtualTreeProps,
  VirtualTreeRowSlotProps,
  VirtualTreeToggleSlotProps,
} from './types';

/**
 * 虚拟树形控件（无样式层）。
 *
 * 三层结构里每层都有一份不可替代的职责：viewport 是滚动容器，content 同时是 `role="tree"`
 * 的焦点宿主与上下 padding 的承载者，row 是 `role="treeitem"`。content 必须是行的直接父元素
 * ——`aria-level` / `aria-posinset` / `aria-setsize` 组成的层级只有在扁平的 treeitem 序列上
 * 才成立，嵌套 `role="group"` 会把未渲染的整棵子树挡在无障碍树之外。
 *
 * 行用 `:key="row.key"`：虚拟层按稳定 key 保存实测高度，DOM 也按同一身份复用。展开收起只改变
 * 当前顺序，不会把旧节点的高度或行内状态转移给另一个节点。缩进交给 `--y-tree-level` 这个数字，
 * 由样式层决定每层让进多少——与 `aria-level` 同一真源。
 *
 * 箭头与勾选框都是不可聚焦的 `data-part` 钩子：这棵树只有一个 tab 停靠点（content 本身），
 * 行内控件若各自可聚焦，`aria-activedescendant` 与真实焦点就会分家；展开与勾选在键盘上
 * 由左右方向键和空格承担。两者都带 `aria-hidden`，状态已经写在行的 `aria-expanded`
 * 与 `aria-checked` 上，读屏不需要再念一次装饰。
 */
defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

/** aria-* 必须落在 role=tree 的 content 上，class/style 等宿主属性仍属于 viewport。 */
const viewportAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([name]) => !name.startsWith('aria-')))
);

const contentAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([name]) => name.startsWith('aria-')))
);

const props = withDefaults(defineProps<VirtualTreeProps<T>>(), {
  data: () => [],
  fields: undefined,
  selection: undefined,
  checkable: false,
  expandedKeys: undefined,
  defaultExpandedKeys: undefined,
  selectedKeys: undefined,
  defaultSelectedKeys: undefined,
  checkedKeys: undefined,
  defaultCheckedKeys: undefined,
  activeKey: undefined,
  height: undefined,
  estimateSize: undefined,
  overscan: undefined,
});

const emit = defineEmits<VirtualTreeEmits>();

defineSlots<{
  default(props: VirtualTreeRowSlotProps<T>): unknown;
  toggle(props: VirtualTreeToggleSlotProps<T>): unknown;
  checkbox(props: VirtualTreeCheckboxSlotProps<T>): unknown;
}>();

const tree = useVirtualTree({
  data: toRef(() => props.data),
  fields: toRef(() => props.fields),
  selection: toRef(() => props.selection),
  checkable: toRef(() => props.checkable),
  expandedKeys: toRef(() => props.expandedKeys),
  defaultExpandedKeys: props.defaultExpandedKeys,
  onExpandedKeysChange: (keys) => emit('update:expandedKeys', keys),
  selectedKeys: toRef(() => props.selectedKeys),
  defaultSelectedKeys: props.defaultSelectedKeys,
  onSelectedKeysChange: (keys) => emit('update:selectedKeys', keys),
  checkedKeys: toRef(() => props.checkedKeys),
  defaultCheckedKeys: props.defaultCheckedKeys,
  onCheckedKeysChange: (keys) => emit('update:checkedKeys', keys),
  activeKey: toRef(() => props.activeKey),
  onActiveKeyChange: (key) => emit('update:activeKey', key),
  estimateSize: toRef(() => props.estimateSize),
  overscan: toRef(() => props.overscan),
});

/** 数字按 px 处理，字符串原样交给 CSS；`overflow-y` 没有它整个滚动行为不成立。 */
const viewportStyle = computed(() => ({
  overflowY: 'auto' as const,
  ...(props.height === undefined
    ? null
    : { height: typeof props.height === 'number' ? `${props.height}px` : props.height }),
}));

/**
 * `box-sizing` 必须是 content-box：padding 表示的是区间外那些行累计出来的高度，
 * 宿主把全局设成 border-box 时它会吃掉内容区，一旦生效总高就少算一屏，而这不会被测量发现。
 */
const contentStyle = computed(() => ({
  boxSizing: 'content-box' as const,
  paddingTop: tree.paddingTop.value,
  paddingBottom: tree.paddingBottom.value,
}));

/** 行只下发层级数字，不写缩进量：缩进是样式层的决定。 */
function rowStyle(row: TreeRow<T>): Record<string, string> {
  return { '--y-tree-level': String(row.level) };
}

/**
 * 勾选三态交给插槽。
 *
 * 行数据里没有这一项，而画勾选框的模板读不到自己的 expose——不给出去的话成品层只能把
 * `aria-checked` 再解析一遍，等于把同一个结论写两处。
 */
function checkStateOf(row: TreeRow<T>): TreeCheckState {
  return tree.checkStates.value.get(row.key) ?? 'unchecked';
}

/** 宿主语义属性与组件内部焦点语义合并，内部派生值优先。 */
const rootAttrs = computed(() => ({
  ...contentAttrs.value,
  ...tree.getRootAttrs(),
}));

/** 点击一行：活动行跟着走，选中按 `selection` 模式生效。展开只由箭头与方向键负责。 */
function onRowClick(row: TreeRow<T>): void {
  // 禁用行整行不响应：键盘导航本来就跳过它，点击若还把它设成活动行，
  // `aria-activedescendant` 就指向了一个 `aria-disabled` 的节点。
  if (row.disabled) return;

  tree.setActiveKey(row.key);
  tree.selectRow(row);
}

defineExpose({
  rows: tree.rows,
  visibleRows: tree.visibleRows,
  expandedKeys: tree.expandedKeys,
  selectedKeys: tree.selectedKeys,
  checkedKeys: tree.checkedKeys,
  checkStates: tree.checkStates,
  activeKey: tree.activeKey,
  totalSize: tree.totalSize,
  scrollTop: tree.scrollTop,
  viewportSize: tree.viewportSize,
  expand: tree.expand,
  collapse: tree.collapse,
  toggleExpand: tree.toggleExpand,
  expandAll: tree.expandAll,
  collapseAll: tree.collapseAll,
  selectRow: tree.selectRow,
  clearSelection: tree.clearSelection,
  toggleCheck: tree.toggleCheck,
  setActiveKey: tree.setActiveKey,
  scrollToKey: tree.scrollToKey,
  invalidateMeasurements: tree.invalidateMeasurements,
} satisfies Partial<UseVirtualTreeReturn>);
</script>

<template>
  <div
    v-bind="viewportAttrs"
    :ref="tree.setViewportElement"
    data-part="viewport"
    :style="viewportStyle"
  >
    <div
      v-bind="rootAttrs"
      :ref="tree.setContentElement"
      data-part="content"
      :style="contentStyle"
      @keydown="tree.onKeydown"
    >
      <div
        v-for="row in tree.visibleRows.value"
        :key="row.key"
        data-part="row"
        :data-key="row.key"
        :style="rowStyle(row)"
        v-bind="tree.getItemAttrs(row)"
        @click="onRowClick(row)"
      >
        <span
          v-if="row.branch"
          data-part="toggle"
          aria-hidden="true"
          @click.stop="tree.toggleExpand(row)"
        >
          <slot name="toggle" :row="row" :expanded="row.expanded" />
        </span>
        <span
          v-if="props.checkable"
          data-part="checkbox"
          aria-hidden="true"
          @click.stop="tree.toggleCheck(row)"
        >
          <slot name="checkbox" :row="row" :state="checkStateOf(row)" />
        </span>
        <slot :row="row" :node="row.node" :selected="tree.selectedKeys.value.includes(row.key)" />
      </div>
    </div>
  </div>
</template>
