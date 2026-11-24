export type {
  SplitterBarProps,
  SplitterPanelEmits,
  SplitterPanelProps,
  SplitterRootEmits,
  SplitterRootProps,
} from './types';

// 尺寸与折叠的入参形状经本层转出：成品层与消费者只依赖 @agile-plus/ui
// 就能标注这些 props，不必各自声明对 primitives 的依赖。
export type {
  SplitterCollapsible,
  SplitterDirection,
  SplitterLayout,
  SplitterSizeInput,
} from '@agile-plus/primitives/splitter';

export { default as SplitterBar } from './SplitterBar.vue';

export { default as SplitterPanel } from './SplitterPanel.vue';

export { default as SplitterRoot } from './SplitterRoot.vue';
