<script setup lang="ts">
import { computed, inject } from 'vue';

import { useComponentContext } from '../context';

import type { UseFormFieldReturn } from '@agile-plus/headless';

import type { FormFieldValidityStateProps } from './types';

/**
 * 把字段的原始校验状态交给插槽。
 *
 * 存在的理由：内置 `match` 只覆盖 10 个状态，而 `validity` 上还有 `validationMessage`
 * 这类信息；消费者要按它定制文案时不必去读 DOM。它不渲染任何元素，因此不会给布局
 * 增加一层。
 */
const props = withDefaults(defineProps<FormFieldValidityStateProps>(), { name: undefined });

const form = useComponentContext('form');

const field = inject<UseFormFieldReturn | undefined>('formField', undefined);

const name = computed(() => props.name ?? field?.name.value);

if (!props.name && !field) {
  throw new Error('FormFieldValidityState 需要 name：请把它放进 FormField，或显式提供 name。');
}

const validity = computed(() => (name.value ? form.getFieldValidity(name.value) : undefined));
</script>

<template>
  <slot :validity="validity" />
</template>
