<script setup lang="ts">
import { computed } from 'vue';

import { Button as ButtonBase } from '@agile-plus/ui/button';

import type { ButtonProps } from './types';

/**
 * 带样式的按钮。
 *
 * 交互语义（点击、键盘激活、loading 期间禁用）全部来自无样式层；本层只补
 * 外观变体类名与 loading spinner。spinner 用 currentcolor 跟随当前变体文字色，
 * 不另维护一套颜色变量。
 *
 * asChild 时不注入 spinner：Slot 要求唯一元素子节点，注入会破坏替换语义；
 * 此时 loading 仍输出 data-loading / aria-busy，视觉由消费者自绘。
 */
const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'default',
  size: 'middle',
  disabled: false,
  loading: false,
  type: 'button',
  as: 'button',
  asChild: false,
});

// variant / size 是本层视觉属性，透传给原生 button 会成为无效属性，先剔除。
const baseProps = computed(() => {
  const { variant: _variant, size: _size, ...rest } = props;

  return rest;
});

defineSlots<{
  /** 按钮文案或图标 */
  default(): unknown;
}>();
</script>

<template>
  <ButtonBase
    v-bind="baseProps"
    :class="['y-button', `y-button--${props.variant}`, `y-button--${props.size}`]"
  >
    <span v-if="props.loading && !props.asChild" class="y-button__spinner" aria-hidden="true" />

    <slot />
  </ButtonBase>
</template>

<style lang="scss">
@use './Button.scss';
</style>