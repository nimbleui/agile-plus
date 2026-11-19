export { default as Select } from './Select.vue';

export type { SelectSize, SelectVariant } from './types';

// 选项数据类型经本层转出：消费者只依赖 @agile-plus/components/select 就能给 options 标注类型。
export type { SelectOptionItem } from '@agile-plus/ui';
