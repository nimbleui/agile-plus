<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useDatePicker } from '@agile-plus/headless';

import type { PropType } from 'vue';

import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy, UseDatePickerReturn } from '@agile-plus/headless';

/**
 * DatePicker 根组件：只持有状态并下发上下文，不渲染任何元素。
 *
 * 焦点模型与 Select 相同：焦点始终留在输入框上，面板用 aria-activedescendant
 * 指向焦点格，因此这里不需要焦点陷阱也不锁滚动。
 *
 * 布尔属性用运行时声明并显式 default: undefined：类型写法会把 `open?: boolean`
 * 推断成 Boolean prop，未传入时得到 false，而受控判定依赖 undefined，
 * 结果是「不写 v-model:open 的面板永远打不开」。flip / shift 同理，
 * 缺省要交给无头层决定而不是在这里钉成 false。
 */
const props = defineProps({
  modelValue: { type: String as PropType<string | null>, default: undefined },
  defaultValue: { type: String as PropType<string | null>, default: null },
  // 缺省交给无头层随 showTime 决定（日期或日期时间），这里钉死会盖掉时间格式。
  valueFormat: { type: String, default: undefined },
  format: { type: String, default: undefined },
  showTime: { type: Boolean, default: false },
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  disabledDate: { type: Function as PropType<(date: Date) => boolean>, default: undefined },
  firstDayOfWeek: { type: Number, default: 1 },
  name: { type: String, default: undefined },
  form: { type: String, default: undefined },
  ariaLabelledby: { type: String, default: undefined },
  ariaDescribedby: { type: String, default: undefined },
  placement: { type: String as PropType<FloatingPlacement>, default: undefined },
  offset: { type: [Number, Object] as PropType<number | FloatingOffset>, default: undefined },
  flip: { type: Boolean, default: undefined },
  shift: { type: Boolean, default: undefined },
  padding: { type: Number, default: undefined },
  strategy: { type: String as PropType<FloatingStrategy>, default: undefined },
});

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  'update:open': [value: boolean];
}>();

const picker = useDatePicker({
  ...props,
  modelValue: toRef(() => props.modelValue),
  open: toRef(() => props.open),
  disabled: toRef(() => props.disabled),
  showTime: toRef(() => props.showTime),
  // 展开的 ...props 是挂载时快照：格式与 showTime 运行中可切换，必须响应式转交。
  valueFormat: toRef(() => props.valueFormat),
  format: toRef(() => props.format),
  // 谓词带参数，不能走 toValue；包一层闭包读最新 props，响应式依赖在调用点收集。
  disabledDate: (date) => props.disabledDate?.(date) ?? false,
  firstDayOfWeek: toRef(() => props.firstDayOfWeek),
  name: toRef(() => props.name),
  form: toRef(() => props.form),
  ariaLabelledby: toRef(() => props.ariaLabelledby),
  ariaDescribedby: toRef(() => props.ariaDescribedby),
  onValueChange: (value) => emit('update:modelValue', value),
  onOpenChange: (value) => emit('update:open', value),
});

provide('datePicker', picker);

defineExpose({
  value: picker.value,
  setValue: picker.setValue,
  open: picker.open,
  close: picker.close,
  isOpen: picker.isOpen,
  // 成品层的面板头部 / 页脚 / 单元格插槽在 Root 之外渲染，读不到 provide 的上下文，
  // 因此面板导航与格子状态经 expose 转交，与 Select 的 rootRef 用法同构。
  panel: picker.panel,
  panelDate: picker.panelDate,
  setPanel: picker.setPanel,
  shiftView: picker.shiftView,
  decadeLabel: picker.decadeLabel,
  goToday: picker.goToday,
  isTodayDisabled: picker.isTodayDisabled,
  getCellState: picker.getCellState,
  showTime: picker.showTime,
  timeParts: picker.timeParts,
  setTimePart: picker.setTimePart,
  confirm: picker.confirm,
  goNow: picker.goNow,
  getTimeListProps: picker.getTimeListProps,
  getTimeOptionProps: picker.getTimeOptionProps,
  onCellPointerDown: picker.onCellPointerDown,
} satisfies Partial<UseDatePickerReturn>);
</script>

<template>
  <slot />
</template>
