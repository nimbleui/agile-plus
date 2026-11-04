<script setup lang="ts">
import { computed, provide, toRef } from 'vue';

import { useFormField } from '@agile-plus/headless';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { FormFieldProps } from './types';

/**
 * 字段容器。
 *
 * 它存在的意义只有两件：给这一组控件一个共用的 id（Label 的 `for` 与 Control 的 `id`
 * 必须同源），以及把「这个字段现在无效」的状态摊到外层元素上，让样式层可以整块描红。
 *
 * 校验结果不在这里，而在表单的注册表里：Message 与 ValidityState 都可以脱离 Field、
 * 只靠 `name` 挂到同一个字段上。
 */
const props = withDefaults(defineProps<FormFieldProps>(), {
  serverInvalid: false,
  id: undefined,
  as: 'div',
  asChild: false,
});

const form = useComponentContext('form');

const field = useFormField(
  {
    name: toRef(() => props.name),
    serverInvalid: toRef(() => props.serverInvalid),
    id: toRef(() => props.id),
  },
  form
);

provide('formField', field);

const fieldAttrs = computed(() => field.getStateAttrs());

/**
 * 插槽参数要提到 setup 顶层。
 *
 * 模板只对 setup 根上的 ref 做自动解包，`field.validity` 这种「普通对象里的 ref 成员」
 * 传出去就是 ComputedRef 对象本身，消费者得再多写一层 .value 才能拿到值。
 */
const validity = field.validity;

const serverInvalid = field.serverInvalid;
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="fieldAttrs" data-part="field">
    <!-- 不能写 :name：Vue 会把它当成插槽名去查找，而不是传一个字段名参数 -->
    <slot :validity="validity" :server-invalid="serverInvalid" />
  </Slot>
</template>
