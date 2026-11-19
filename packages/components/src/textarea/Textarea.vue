<script setup lang="ts">
import { Textarea as TextareaBase } from '@agile-plus/ui/textarea';

import type { TextareaEmits } from '@agile-plus/ui';

import type { TextareaProps } from './types';

/**
 * 带样式的多行输入框。
 *
 * 值管理、IME 与 Form 集成沿用无样式层；本层只补 `.y-textarea` 类名与视觉。
 * 高度默认两行起步、允许纵向拖拽；rows 等原生属性经 attrs 透传。
 */
withDefaults(defineProps<TextareaProps>(), {
  modelValue: undefined,
  defaultValue: '',
  disabled: false,
  readOnly: false,
  required: false,
  name: undefined,
  id: undefined,
  form: undefined,
  as: 'textarea',
  asChild: false,
});

const emit = defineEmits<TextareaEmits>();
</script>

<template>
  <TextareaBase
    v-bind="$props"
    class="y-textarea"
    @update:model-value="(value) => emit('update:modelValue', value)"
    @change="(event) => emit('change', event)"
  />
</template>

<style lang="scss">
@use './Textarea.scss';
</style>