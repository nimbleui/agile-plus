<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';

/**
 * DatePicker 的输入框（触发元素）。
 *
 * 它既是手动编辑的文本框，也是 combobox 的焦点宿主：开合、导航、确认全部由
 * 无头层的按键处理器接管，格子点击不会把焦点从这里抢走（pointerdown 被拦掉）。
 * placeholder、class 等视觉属性经 $attrs 由成品层传入。
 */
defineOptions({ inheritAttrs: false });

const picker = useComponentContext('datePicker');

const triggerProps = computed(() => picker.getTriggerProps());

function setElement(node: unknown): void {
  picker.setTriggerElement(node);
}
</script>

<template>
  <input
    :ref="setElement"
    type="text"
    v-bind="{ ...triggerProps, ...$attrs }"
    :value="picker.displayText.value"
    data-part="trigger"
    @input="picker.onInputInput"
    @keydown="picker.onInputKeydown"
    @blur="picker.onInputBlur"
    @focus="picker.onInputFocus"
    @click="picker.onInputClick"
  />
</template>
