export { default as DateRangePicker } from './DateRangePicker.vue';

export type { DateRangePickerSize, DateRangePickerVariant, DateRangePreset } from './types';

// 范围契约经本层转出：消费者只依赖 @agile-plus/components/date-range-picker
// 就能给 disabledDate、cell 插槽与 presets 标注类型。
export type { DateRangeCellState, DateRangeSide } from '@agile-plus/ui';
