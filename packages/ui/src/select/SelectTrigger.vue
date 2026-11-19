<script setup lang="ts">
import { computed } from 'vue';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { SelectTriggerProps } from './types';

/**
 * Select 触发元素。
 *
 * 渲染成 role="combobox" 的按钮，全部键盘交互都绑在这里——焦点不移进浮层，
 * 列表靠 aria-activedescendant 播报高亮项，因此 Tab 天然能走出组件。
 *
 * 隐藏原生 select 是按钮的**兄弟节点**而不是子节点：`<button>` 内不允许再放交互
 * 元素。它靠内联样式覆盖在按钮之上，承担 FormData 提交、required 校验与 form 的
 * change 事件，指针事件照旧落在按钮上。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SelectTriggerProps>(), {
  as: 'button',
  asChild: false,
});

const select = useComponentContext('select');

const triggerProps = computed(() => select.getTriggerProps());

const nativeSelectProps = computed(() => select.getNativeSelectProps());

/**
 * 自家渲染 button 时补 `type="button"`：HTML 里 `<button>` 缺省即 `submit`，
 * 放进表单的选择器会在每次开合之外悄悄提交一次。
 *
 * asChild 与非 button 标签不给：`<a>` 的 `type` 是链接的媒体类型，写上去是错误语义。
 * 排在 `$attrs` 之前，消费者显式传 `type` 仍可覆盖。
 */
const typeProp = computed(() => (props.asChild || props.as !== 'button' ? {} : { type: 'button' }));
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="select.setTriggerElement"
    v-bind="{ ...typeProp, ...triggerProps, ...$attrs }"
    data-part="trigger"
    @click="select.onTriggerClick"
    @keydown="select.onTriggerKeydown"
    @blur="select.onTriggerBlur"
  >
    <slot />
  </Slot>

  <select
    v-if="nativeSelectProps"
    :ref="select.setNativeSelectElement"
    v-bind="nativeSelectProps"
    data-part="native-select"
  >
    <option
      v-for="option in select.nativeOptions.value"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
    >
      {{ option.textValue }}
    </option>
  </select>
</template>
