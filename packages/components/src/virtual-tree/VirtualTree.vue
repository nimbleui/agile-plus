<script setup lang="ts" generic="T extends TreeDataNode = TreeDataNode">
import { computed, ref } from 'vue';

import { VirtualTree as VirtualTreePrimitive } from '@agile-plus/ui/virtual-tree';

import type { TreeDataNode, VirtualTreeEmits } from '@agile-plus/ui/virtual-tree';

import type { VirtualTreeHandle, VirtualTreeProps } from './types';

/**
 * 带样式的虚拟树形控件。
 *
 * 三格内容都有默认形状，也都能被插槽整体替换：箭头（只有分支行有）、勾选框（只有
 * `checkable` 时有）、标签。无样式层把这三格按「箭头 → 勾选框 → 内容」的顺序排在行里，
 * 本层只决定它们长什么样，不重排也不复制状态。
 *
 * 本层只加排版与状态色：`overflow-y`、上下 padding、`box-sizing` 这三段功能性样式由无样式层
 * 内联产出，抄一遍会产生两个真源，任一处失效都会让定位算错（与 VirtualList 同一条约束）。
 *
 * 状态一律读行上的 `data-*` 钩子而不是结构类选择器：窗口化渲染里 DOM 只有当前那十几行，
 * `:last-child`、`:nth-child()` 都会随滚动翻面。
 *
 * 勾选框不是真的控件而是装饰：整棵树只有一个 tab 停靠点（`role="tree"` 那一层），结论写在
 * 行的 `aria-checked` 上；点它仍然级联，因为无样式层把点击绑在了勾选格上。
 */
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

/** 标签属于业务字段，动态读取才能同时支持 interface 节点与不同业务形状。 */
function nodeLabel(node: T): unknown {
  return Reflect.get(node, 'label');
}

const treeHandle = ref<VirtualTreeHandle | null>(null);

const rootProps = computed(() => ({
  data: props.data,
  fields: props.fields,
  selection: props.selection,
  checkable: props.checkable,
  expandedKeys: props.expandedKeys,
  defaultExpandedKeys: props.defaultExpandedKeys,
  selectedKeys: props.selectedKeys,
  defaultSelectedKeys: props.defaultSelectedKeys,
  checkedKeys: props.checkedKeys,
  defaultCheckedKeys: props.defaultCheckedKeys,
  activeKey: props.activeKey,
  height: props.height,
  estimateSize: props.estimateSize,
  overscan: props.overscan,
}));

// 挂载前 ref 还是 null，此时树也没有可滚动的容器，跳过比抛错更符合调用时机。
defineExpose({
  expandAll: () => treeHandle.value?.expandAll(),
  collapseAll: () => treeHandle.value?.collapseAll(),
  clearSelection: () => treeHandle.value?.clearSelection(),
  scrollToKey: (key: string) => treeHandle.value?.scrollToKey(key),
  invalidateMeasurements: () => treeHandle.value?.invalidateMeasurements(),
});
</script>

<template>
  <VirtualTreePrimitive
    ref="treeHandle"
    v-bind="rootProps"
    class="y-virtual-tree"
    @update:expanded-keys="(keys) => emit('update:expandedKeys', keys)"
    @update:selected-keys="(keys) => emit('update:selectedKeys', keys)"
    @update:checked-keys="(keys) => emit('update:checkedKeys', keys)"
    @update:active-key="(key) => emit('update:activeKey', key)"
  >
    <template #toggle="toggleProps">
      <slot name="toggle" v-bind="toggleProps">
        <svg
          data-part="arrow"
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4.5 2.5 8 6 4.5 9.5"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </slot>
    </template>

    <template #checkbox="checkboxProps">
      <slot name="checkbox" v-bind="checkboxProps">
        <span data-part="box" class="y-virtual-tree__checkbox" :data-state="checkboxProps.state">
          <svg
            data-part="check"
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2.5 6.3 4.7 8.5 9.5 3.6"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <span data-part="dash" class="y-virtual-tree__dash" />
        </span>
      </slot>
    </template>

    <template #default="rowProps">
      <slot v-bind="rowProps">
        <span class="y-virtual-tree__label">{{ nodeLabel(rowProps.node) }}</span>
      </slot>
    </template>
  </VirtualTreePrimitive>
</template>

<style lang="scss">
@use './VirtualTree.scss';
</style>
