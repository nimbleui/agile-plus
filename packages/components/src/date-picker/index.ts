export { default as DatePicker } from './DatePicker.vue';

export type { DatePickerSize, DatePickerVariant } from './types';

// 日期契约经本层转出：消费者只依赖 @agile-plus/components/date-picker 就能给
// disabledDate、cell 插槽标注类型。
export type { DateCell, DateCellState, DatePanel } from '@agile-plus/ui';
