<script setup lang="ts">
import { provide, toRef } from 'vue';

import { useDateRangePicker } from '@agile-plus/headless';

import type { PropType } from 'vue';

import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy, UseDateRangePickerReturn } from '@agile-plus/headless';

/**
 * DateRangePicker 根组件：只持有状态并下发上下文，不渲染任何元素。
 *
 * 焦点模型与单选 DatePicker 相同：焦点始终留在活跃输入框上，面板用
 * aria-activedescendant 指向焦点格，因此不需要焦点陷阱也不锁滚动。
 *
 * 布尔属性用运行时声明并显式 default: undefined，理由与 DatePickerRoot 相同：
 * 受控判定依赖 undefined，钉成 false 会锁死非受控用法。
 */
const props = defineProps({
  // 用 Object 而不是 Array 构造器：PropType<T> 是 () => T，ArrayConstructor 返回
  // any[]，与定长元组 [string, string] 互不兼容，断言会被 TS 拒绝。运行时 Vue 对
  // Object 的校验是 isObject（数组同样通过），null 值跳过校验，行为与预期一致。
  modelValue: { type: Object as PropType<[string, string] | null>, default: undefined },
  defaultValue: { type: Object as PropType<[string, string] | null>, default: null },
  valueFormat: { type: String, default: 'YYYY-MM-DD' },
  format: { type: String, default: 'YYYY-MM-DD' },
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  disabledDate: { type: Function as PropType<(date: Date) => boolean>, default: undefined },
  firstDayOfWeek: { type: Number, default: 1 },
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
  'update:modelValue': [value: [string, string] | null];
  'update:open': [value: boolean];
}>();

const picker = useDateRangePicker({
  ...props,
  modelValue: toRef(() => props.modelValue),
  open: toRef(() => props.open),
  disabled: toRef(() => props.disabled),
  // 谓词带参数，不能走 toValue；包一层闭包读最新 props，响应式依赖在调用点收集。
  disabledDate: (date) => props.disabledDate?.(date) ?? false,
  firstDayOfWeek: toRef(() => props.firstDayOfWeek),
  ariaLabelledby: toRef(() => props.ariaLabelledby),
  ariaDescribedby: toRef(() => props.ariaDescribedby),
  onValueChange: (value) => emit('update:modelValue', value),
  onOpenChange: (value) => emit('update:open', value),
});

provide('dateRangePicker', picker);

defineExpose({
  value: picker.value,
  setValue: picker.setValue,
  open: picker.open,
  close: picker.close,
  isOpen: picker.isOpen,
  // 成品层的头部导航 / 预设页脚 / 单元格插槽在 Root 之外渲染，读不到 provide
  // 的上下文，因此面板导航与格子状态经 expose 转交，与 DatePickerRoot 同构。
  activeIndex: picker.activeIndex,
  panelDate: picker.panelDate,
  rightPanelDate: picker.rightPanelDate,
  shiftView: picker.shiftView,
  selectRange: picker.selectRange,
  selectRangeByValue: picker.selectRangeByValue,
  setControlElement: picker.setControlElement,
  getCellState: picker.getCellState,
} satisfies Partial<UseDateRangePickerReturn>);
</script>

<template>
  <slot />
</template>
