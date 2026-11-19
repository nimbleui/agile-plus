<script setup lang="ts">
import { computed } from 'vue';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { SelectValueProps } from './types';

/**
 * Select 的选中值回显。
 *
 * 有选中值时显示选项的可读文本（不是 value），并把它与当前值一起交给默认插槽，
 * 消费者要渲染图标 + 文案之类的富内容时不必自己再查一遍选项表。
 *
 * 未选择时切到 placeholder 插槽；纯文本占位直接用 placeholder 属性即可。
 * data-placeholder 由无头层给出，样式层据此把占位文案调成次要色。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SelectValueProps>(), {
  placeholder: '',
  as: 'span',
  asChild: false,
});

const select = useComponentContext('select');

const valueProps = computed(() => select.getValueProps());

defineSlots<{
  /** 选中值回显；不写则显示选项文本 */
  default(props: { value: string; label: string }): unknown;
  /** 未选择时的占位内容；不写则显示 placeholder 属性 */
  placeholder(): unknown;
}>();
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="{ ...valueProps, ...$attrs }">
    <slot
      v-if="select.hasValue.value"
      :value="select.value.value"
      :label="select.selectedText.value"
    >
      {{ select.selectedText.value }}
    </slot>

    <slot v-else name="placeholder">{{ props.placeholder }}</slot>
  </Slot>
</template>
