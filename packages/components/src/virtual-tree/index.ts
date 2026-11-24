export type { VirtualTreeHandle, VirtualTreeProps } from './types';

// 树的数据契约、事件与插槽作用域类型经本层转出：消费者只依赖
// `@agile-plus/components/virtual-tree` 就能给 `data`、`#default` 与 `v-model:*` 标注类型
// ——pnpm 不把 primitives 链接到本包目录，让使用方自己去解析传递依赖等于逼他们写内部路径
// （与 date-picker 同一约定）。本层的 VirtualTreeProps 刻意不转出 ui 层同名类型：两者的字段
// 由 `virtual-tree.test.ts` 的转发用例守住一致，但成品层的 props 是本层的公共 API。
export type {
  TreeCheckState,
  TreeDataNode,
  TreeFieldNames,
  TreeKey,
  TreeRow,
  TreeSelectionMode,
  VirtualTreeCheckboxSlotProps,
  VirtualTreeEmits,
  VirtualTreeRowSlotProps,
  VirtualTreeToggleSlotProps,
} from '@agile-plus/ui/virtual-tree';

export { default as VirtualTree } from './VirtualTree.vue';
