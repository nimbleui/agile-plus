export type {
  SelectContentProps,
  SelectGroupContext,
  SelectGroupProps,
  SelectIconProps,
  SelectItemContext,
  SelectItemIndicatorProps,
  SelectItemProps,
  SelectItemTextProps,
  SelectLabelProps,
  SelectOptionItem,
  SelectRootEmits,
  SelectRootProps,
  SelectSeparatorProps,
  SelectTriggerProps,
  SelectValueProps,
  SelectViewportProps,
} from './types';

// 定位选项类型经本层转出：下游（成品层、消费者）只依赖 @agile-plus/ui 就能给
// placement / offset / strategy 标注类型，不必再各自声明对 primitives 与 headless 的依赖。
export type {
  FloatingArrowOptions,
  FloatingOffset,
  FloatingPlacement,
} from '@agile-plus/primitives/floating';

export type { FloatingStrategy, SelectOption, SelectOptionSeed } from '@agile-plus/headless';

export { default as SelectContent } from './SelectContent.vue';

export { default as SelectGroup } from './SelectGroup.vue';

export { default as SelectIcon } from './SelectIcon.vue';

export { default as SelectItem } from './SelectItem.vue';

export { default as SelectItemIndicator } from './SelectItemIndicator.vue';

export { default as SelectItemText } from './SelectItemText.vue';

export { default as SelectLabel } from './SelectLabel.vue';

export { default as SelectRoot } from './SelectRoot.vue';

export { default as SelectSeparator } from './SelectSeparator.vue';

export { default as SelectTrigger } from './SelectTrigger.vue';

export { default as SelectValue } from './SelectValue.vue';

export { default as SelectViewport } from './SelectViewport.vue';
