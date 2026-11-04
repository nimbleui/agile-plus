<script setup lang="ts">
import { computed, onBeforeUnmount, provide, watch } from 'vue';

import { useComponentContext } from '../context';

import type { RadioGroupItemProps } from './types';

/**
 * 隐藏原生 input 的定位样式。
 *
 * 必须内联而不是交给样式层：它承担「存在于 DOM 但不参与视觉与命中」的行为职责，
 * 无样式层消费者若忘记引 CSS 就会看到多出来的控件。pointer-events: none 保证
 * 点击只落在外层 button 上，避免同一交互触发两套选中路径。
 */
const HIDDEN_INPUT_STYLE = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  top: 0,
  left: 0,
  margin: 0,
  padding: 0,
  opacity: 0,
  pointerEvents: 'none',
} as const;

/**
 * RadioGroup 选项组件。
 *
 * 渲染为 role="radio" 的 button，绑定 aria-checked、roving tabindex 与键盘导航。
 * 使用 button 而非原生 input 作为可交互元素，才能在不牺牲可访问性的前提下
 * 完全控制视觉结构；原生 input 仅作为提交表单的隐藏载体。
 */
const props = defineProps<RadioGroupItemProps>();

const radioGroup = useComponentContext('radioGroup');

// 注册必须在 setup 执行，注册顺序即键盘导航顺序与首个 tab stop 的判定依据。
radioGroup.registerItem(props.value);

watch(
  () => props.disabled,
  (value) => radioGroup.setItemDisabled(props.value, value === true),
  { immediate: true }
);

onBeforeUnmount(() => {
  radioGroup.unregisterItem(props.value);
});

const itemProps = computed(() => radioGroup.getItemProps(props.value));

const inputProps = computed(() => radioGroup.getInputProps(props.value));

const isChecked = computed(() => radioGroup.value.value === props.value);

/**
 * 向内部组件提供选中态，供 RadioGroupIndicator 判断是否挂载。
 *
 * 插槽内容是在本组件的 render 过程中被渲染的，因此写在消费者模板里的 Indicator
 * 其组件实例的 parent 就是这里，能沿 provides 链取到该上下文——外层封装组件把
 * Indicator 放进传给本组件的插槽里同样成立。
 */
provide('radioGroupItem', { isChecked });

/**
 * aria-disabled 不是原生 disabled，浏览器仍会派发 click，
 * 因此必须在选中前拦截，否则禁用项可被鼠标选中却无法被键盘到达。
 */
function select(): void {
  if (radioGroup.isItemDisabled(props.value)) return;

  radioGroup.setValue(props.value);
}
</script>

<template>
  <button type="button" v-bind="itemProps" @click="select" @keydown="radioGroup.onItemKeydown">
    <input v-if="inputProps" v-bind="inputProps" :style="HIDDEN_INPUT_STYLE" @change="select" />

    <slot />
  </button>
</template>
