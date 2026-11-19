export type {
  DateRangePickerCellProps,
  DateRangePickerContentProps,
  DateRangePickerGridProps,
  DateRangePickerInputProps,
  DateRangePickerRootEmits,
  DateRangePickerRootProps,
} from './types';

// 范围契约与定位选项类型经本层转出：下游（成品层、消费者）只依赖
// @agile-plus/ui 就能标注类型，不必再各自声明对 primitives 与 headless 的依赖。
export type {
  DateRangeCellState,
  DateRangeDraft,
  RangeHighlight,
} from '@agile-plus/primitives/date';

export type { DateRangeSide, DateRangeViewUnit } from '@agile-plus/headless';

export type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

export type { FloatingStrategy } from '@agile-plus/headless';

export { default as DateRangePickerCell } from './DateRangePickerCell.vue';

export { default as DateRangePickerContent } from './DateRangePickerContent.vue';

export { default as DateRangePickerGrid } from './DateRangePickerGrid.vue';

export { default as DateRangePickerInput } from './DateRangePickerInput.vue';

export { default as DateRangePickerRoot } from './DateRangePickerRoot.vue';
