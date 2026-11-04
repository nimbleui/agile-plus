<script setup lang="ts">
import { computed, inject, useAttrs, toRef } from 'vue';

import { useFormControl } from '@agile-plus/headless';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { UseFormFieldReturn } from '@agile-plus/headless';

import type { FormFieldControlProps } from './types';

/**
 * 字段的原生控件。
 *
 * 校验发生在原生 `change`（失焦或选项确认）而不是每次按键：这是 Radix 的同一取舍——
 * 逐键报错既吵，也会让异步匹配器被反复触发。用户改动值时只清掉上一轮判定，
 * 不立刻重判，所以正在输入的过程中不会挂着一条已经过时的错误文案。
 *
 * `asChild` 只应指向 `input` / `textarea` / `select`：它们是规范里的约束校验目标。
 * 本库的 Checkbox / Switch 是 `button` 语义，虽然也带 `validity`，但 `required`、
 * `pattern` 这些约束属性对它无效，字段会恒判为合法。
 */
const props = withDefaults(defineProps<FormFieldControlProps>(), {
  name: undefined,
  id: undefined,
  as: 'input',
  asChild: false,
});

// Slot 不自动继承 attrs，而 aria-describedby 需要与错误文案 id 合并，必须先读出来。
const attrs = useAttrs();

const form = useComponentContext('form');

const field = inject<UseFormFieldReturn | undefined>('formField', undefined);

const control = useFormControl(
  {
    name: toRef(() => props.name),
    id: toRef(() => props.id),
    describedby: () => attrs['aria-describedby'] as string | undefined,
  },
  form,
  field
);

const controlAttrs = computed(() => control.getAttrs());
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="control.setControlElement"
    v-bind="{ ...attrs, ...controlAttrs }"
    data-part="control"
    @change="control.validate"
    @input="control.onControlInput"
    @invalid="control.onControlInvalid"
  />
</template>
