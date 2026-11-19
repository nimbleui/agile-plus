<script setup lang="ts">
import { computed, ref } from 'vue';

import { getButtonAttrs } from '@agile-plus/primitives/button';

import { Slot } from '../slot';

import type { ButtonProps } from './types';

/**
 * 无样式按钮。
 *
 * 没有状态机也不需要 headless：点击、键盘激活、表单提交语义全部来自原生 button。
 * 本层只做两件事——loading 期间合并进禁用态（防止重复提交），以及输出
 * data-disabled / data-loading / aria-busy 钩子供样式层与读屏消费。
 *
 * type 默认 'button' 是刻意选择：库内大量组件放进 FormRoot 使用，默认 submit
 * 会让任意按钮意外触发提交。
 */
const props = withDefaults(defineProps<ButtonProps>(), {
  disabled: false,
  loading: false,
  type: 'button',
  as: 'button',
  asChild: false,
});

const control = ref<HTMLElement | null>(null);

function setControl(node: unknown): void {
  control.value = node instanceof HTMLElement ? node : null;
}

const rootAttrs = computed(() => ({
  type: props.type,
  disabled: props.disabled || props.loading || undefined,
  ...getButtonAttrs({
    disabled: props.disabled || props.loading,
    loading: props.loading,
  }),
}));

function focus(): void {
  control.value?.focus();
}

function blur(): void {
  control.value?.blur();
}

defineExpose({ control, focus, blur });
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="setControl"
    v-bind="{ ...rootAttrs, ...$attrs }"
    data-part="button"
  >
    <slot />
  </Slot>
</template>