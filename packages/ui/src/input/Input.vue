<script setup lang="ts">
import { computed, inject, toRef, useAttrs } from 'vue';

import { useFormControl, useInput } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { UseFormFieldReturn, UseFormReturn } from '@agile-plus/headless';

import type { InputEmits, InputProps } from './types';

/**
 * 无样式输入框。
 *
 * 值真源、IME 组合输入与表单 reset 复原在 useInput 里；本层只负责属性落点与
 * Form 集成。放进 FormRoot 时自动注入校验注册表（与 FormFieldControl 复用同一个
 * useFormControl，校验逻辑没有第二份）：在 FormField 内可省略 name / id，错误文案
 * 的 aria-describedby 自动合并；脱离 Form 独立使用时不创建校验实例。
 *
 * 消费者传入的 placeholder / maxlength / pattern 等原生属性经 attrs 透传；
 * id / name / value / aria 以组件与 Form 的契约为准，因此 rootAttrs 放在 attrs 之后。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<InputProps>(), {
  // modelValue 必须显式留 undefined：String prop 缺省会被 cast 成 ''，
  // useInput 用 undefined 判定是否受控，否则非受控用法会被锁死在空串。
  modelValue: undefined,
  defaultValue: '',
  type: 'text',
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

// Slot 不自动继承 attrs，而 aria-describedby 需要与错误文案 id 合并，必须先读出来。
const attrs = useAttrs();

const input = useInput({
  modelValue: toRef(() => props.modelValue),
  defaultValue: props.defaultValue,
  type: toRef(() => props.type),
  disabled: toRef(() => props.disabled),
  readOnly: toRef(() => props.readOnly),
  required: toRef(() => props.required),
  form: toRef(() => props.form),
  onModelValueChange: (value) => emit('update:modelValue', value),
});

const formContext = inject<UseFormReturn | undefined>('form', undefined);

const fieldContext = inject<UseFormFieldReturn | undefined>('formField', undefined);

// inject 的结果在组件生命周期内稳定，setup 期一次性判定即可；
// 脱离 Form 时不创建校验实例，独立使用不需要 name。
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
  ...input.getRootProps(),
  ...formControl?.getAttrs(),
  value: input.value.value,
}));

function setControl(node: unknown): void {
  input.setControl(node);

  formControl?.setControlElement(node);
}

function onInput(event: Event): void {
  input.onInput(event);

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
  input.control.value?.focus();
}

function blur(): void {
  input.control.value?.blur();
}

function select(): void {
  input.control.value?.select();
}

defineExpose({
  value: input.value,
  control: input.control,
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
    data-part="input"
    @input="onInput"
    @change="onChange"
    @invalid="onInvalid"
    @compositionstart="input.onCompositionStart"
    @compositionend="input.onCompositionEnd"
  >
    <slot />
  </Slot>
</template>