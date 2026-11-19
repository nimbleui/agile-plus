<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

import type { DateRangePickerInputProps } from './types';

/**
 * DateRangePicker 的一端输入框（触发元素）。
 *
 * 两端共享一个面板：index 决定它是起点还是终点，活跃端由无头层管理。
 * placeholder、class 等视觉属性经 $attrs 由成品层传入。
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<DateRangePickerInputProps>();

const picker = useComponentContext('dateRangePicker');

const triggerProps = computed(() => picker.getTriggerProps(props.index));

const displayText = computed(() => picker.displayTexts.value[props.index]);

function setElement(node: unknown): void {
  picker.setTriggerElement(node, props.index);
}
</script>

<template>
  <input
    :ref="setElement"
    type="text"
    v-bind="{ ...triggerProps, ...$attrs }"
    :value="displayText"
    data-part="trigger"
    @input="(event) => picker.onInputInput(props.index, event)"
    @keydown="(event) => picker.onInputKeydown(props.index, event)"
    @blur="picker.onInputBlur(props.index)"
    @focus="picker.onInputFocus(props.index)"
    @click="picker.onInputClick(props.index)"
  />
</template>
