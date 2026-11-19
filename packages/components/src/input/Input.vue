<script setup lang="ts">
import { computed } from 'vue';

import { Input as InputBase } from '@agile-plus/ui/input';

import type { InputEmits } from '@agile-plus/ui';

import type { InputProps } from './types';

/**
 * 带样式的输入框。
 *
 * 值管理、IME 与 Form 集成全部沿用无样式层；本层只补 `.y-input` 类名与尺寸变体。
 * 校验态视觉读 Form 落在控件上的 `[data-invalid]`，不另维护一套无效状态。
 */
const props = withDefaults(defineProps<InputProps>(), {
  modelValue: undefined,
  defaultValue: '',
  type: 'text',
  size: 'middle',
  disabled: false,
  readOnly: false,
  required: false,
  name: undefined,
  id: undefined,
  form: undefined,
  as: 'input',
  asChild: false,
});

const emit = defineEmits<InputEmits>();

// size 是本层视觉属性，透传给原生 input 会变成无效的 size 属性，先剔除再交下去。
const baseProps = computed(() => {
  const { size: _size, ...rest } = props;

  return rest;
});
</script>

<template>
  <InputBase
    v-bind="baseProps"
    :class="['y-input', `y-input--${props.size}`]"
    @update:model-value="(value) => emit('update:modelValue', value)"
    @change="(event) => emit('change', event)"
  />
</template>

<style lang="scss">
@use './Input.scss';
</style>