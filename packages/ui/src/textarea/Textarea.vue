<script setup lang="ts">
import { computed, inject, toRef, useAttrs } from 'vue';

import { useFormControl, useTextarea } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { UseFormFieldReturn, UseFormReturn } from '@agile-plus/headless';

import type { TextareaEmits, TextareaProps } from './types';

/**
 * 无样式多行输入框。
 *
 * 与 Input 共用 useTextControl 值内核与同一套 Form 自动注入：放进 FormRoot 时
 * 接上校验注册表，脱离 Form 独立使用。rows / wrap 等原生属性经 attrs 透传。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<TextareaProps>(), {
  // modelValue 必须显式留 undefined，理由见 Input：受控判定以 undefined 为唯一判据。
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

const attrs = useAttrs();

const textarea = useTextarea({
  modelValue: toRef(() => props.modelValue),
  defaultValue: props.defaultValue,
  disabled: toRef(() => props.disabled),
  readOnly: toRef(() => props.readOnly),
  required: toRef(() => props.required),
  form: toRef(() => props.form),
  onModelValueChange: (value) => emit('update:modelValue', value),
});

const formContext = inject<UseFormReturn | undefined>('form', undefined);

const fieldContext = inject<UseFormFieldReturn | undefined>('formField', undefined);

const formControl = formContext
  ? useFormControl(
      {
        name: toRef(() => props.name),
        id: toRef(() => props.id),
        describedby: () => attrs['aria-describedby'] as string | undefined,
      },
      formContext,
      fieldContext
    )
  : null;

const rootAttrs = computed(() => ({
  ...textarea.getRootProps(),
  ...formControl?.getAttrs(),
  value: textarea.value.value,
}));

function setControl(node: unknown): void {
  textarea.setControl(node);

  formControl?.setControlElement(node);
}

function onInput(event: Event): void {
  textarea.onInput(event);

  formControl?.onControlInput();
}

function onChange(event: Event): void {
  void formControl?.validate();

  emit('change', event);
}

function onInvalid(): void {
  formControl?.onControlInvalid();
}

function focus(): void {
  textarea.control.value?.focus();
}

function blur(): void {
  textarea.control.value?.blur();
}

function select(): void {
  textarea.control.value?.select();
}

defineExpose({
  value: textarea.value,
  control: textarea.control,
  focus,
  blur,
  select,
});
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="setControl"
    v-bind="{ ...$attrs, ...rootAttrs }"
    data-part="textarea"
    @input="onInput"
    @change="onChange"
    @invalid="onInvalid"
    @compositionstart="textarea.onCompositionStart"
    @compositionend="textarea.onCompositionEnd"
  >
    <slot />
  </Slot>
</template>