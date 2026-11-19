export type {
  DatePickerCellProps,
  DatePickerContentProps,
  DatePickerGridProps,
  DatePickerRootEmits,
  DatePickerRootProps,
} from './types';

// 日期契约与定位选项类型经本层转出：下游（成品层、消费者）只依赖
// @agile-plus/ui 就能标注类型，不必再各自声明对 primitives 与 headless 的依赖。
export type { DateCell, DateCellState, DatePanel } from '@agile-plus/primitives/date';

export type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

export type {
  DatePickerTimePart,
  DatePickerTimeParts,
  DatePickerViewUnit,
  FloatingStrategy,
} from '@agile-plus/headless';

export { default as DatePickerCell } from './DatePickerCell.vue';

export { default as DatePickerContent } from './DatePickerContent.vue';

export { default as DatePickerGrid } from './DatePickerGrid.vue';

export { default as DatePickerInput } from './DatePickerInput.vue';

export { default as DatePickerRoot } from './DatePickerRoot.vue';
