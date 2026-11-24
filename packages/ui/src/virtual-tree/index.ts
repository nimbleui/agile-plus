// 转发 primitives 的树类型：Components 层只直接依赖本包（pnpm 不链接传递依赖），
// 行的数据结构与选中模式必须经此公开出口消费，与 table 的转发同一约定（架构 2.1）。
export type {
  TreeCheckState,
  TreeDataNode,
  TreeFieldNames,
  TreeIndex,
  TreeIndexNode,
  TreeKey,
  TreeRow,
  TreeSelectionMode,
} from '@agile-plus/primitives/tree';

export type {
  VirtualTreeCheckboxSlotProps,
  VirtualTreeEmits,
  VirtualTreeProps,
  VirtualTreeRowSlotProps,
  VirtualTreeToggleSlotProps,
} from './types';

export { default as VirtualTree } from './VirtualTree.vue';
