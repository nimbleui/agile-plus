<script setup lang="ts">
import { computed } from 'vue';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { TooltipTriggerProps } from './types';

/**
 * Tooltip 触发元素。
 *
 * 同时接指针与焦点两条触发路径：鼠标悬停走延迟，键盘聚焦立即打开。
 * 元素引用交给 floating 做锚点测量，因此 asChild 换成任意元素也能定位。
 *
 * 不改 tabindex：触发元素本来就应当可聚焦（button / a / 带 tabindex 的控件），
 * 由组件强行加 tabindex 会把不可交互的装饰元素也变成 Tab 落点。
 */
const props = withDefaults(defineProps<TooltipTriggerProps>(), {
  as: 'button',
  asChild: false,
});

const tooltip = useComponentContext('tooltip');

const triggerProps = computed(() => tooltip.getTriggerProps());

/**
 * 自家渲染 button 时补 `type="button"`：HTML 里 `<button>` 缺省即 `submit`，
 * 放进表单的提示按钮会在悬停之外悄悄提交一次。
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
    :el-ref="tooltip.floating.referenceRef"
    v-bind="{ ...typeProp, ...triggerProps, ...$attrs }"
    data-part="trigger"
    @pointerenter="tooltip.onTriggerPointerEnter"
    @pointerleave="tooltip.onTriggerPointerLeave"
    @focus="tooltip.onTriggerFocus"
    @blur="tooltip.onTriggerBlur"
    @keydown="tooltip.onTriggerKeydown"
  >
    <slot />
  </Slot>
</template>
