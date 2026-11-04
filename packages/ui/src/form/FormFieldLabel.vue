<script setup lang="ts">
import { computed, inject } from 'vue';

import { getFieldStateAttrs } from '@agile-plus/primitives/form';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { UseFormFieldReturn } from '@agile-plus/headless';

import type { FormFieldLabelProps } from './types';

/**
 * 字段标签。
 *
 * 与 Radix 一致：脱离 FormField 时可以用 `name` + `htmlFor` 自己指认字段，这样
 * 「标签在网格的一格、控件在另一格」这种布局也能成立。两者都拿不到时属于用法错误，
 * 直接抛错而不是渲染一个没有 `for` 的标签——静默失效的关联比报错更难查。
 */
const props = withDefaults(defineProps<FormFieldLabelProps>(), {
  name: undefined,
  htmlFor: undefined,
  as: 'label',
  asChild: false,
});

const form = useComponentContext('form');

const field = inject<UseFormFieldReturn | undefined>('formField', undefined);

const name = computed(() => props.name ?? field?.name.value);

if (!props.name && !field) {
  throw new Error('FormFieldLabel 需要 name：请把它放进 FormField，或显式提供 name。');
}

const targetId = computed(() => props.htmlFor ?? field?.id.value);

if (!props.htmlFor && !field) {
  throw new Error('FormFieldLabel 需要 for：请把它放进 FormField，或显式提供 htmlFor。');
}

const labelAttrs = computed(() => ({
  ...getFieldStateAttrs({
    validity: name.value ? form.getFieldValidity(name.value) : undefined,
    serverInvalid: field?.serverInvalid.value === true,
  }),
  for: targetId.value,
}));
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="labelAttrs" data-part="label">
    <slot />
  </Slot>
</template>
