<script setup lang="ts">
import { provide } from 'vue';

import { useForm } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { PropType } from 'vue';

/**
 * 表单根元素。
 *
 * 除了渲染 `<form>`，它只做两件 Radix 也做的事：
 *
 * 1. 持有字段级校验注册表（通过 provide 下发给各部件）。
 * 2. 接住冒泡上来的 `invalid`：把焦点交给第一个无效控件，并 `preventDefault()` 关掉
 *    浏览器原生气泡——文案已经由 Message 呈现，再叠一个系统气泡既重复又无法主题化。
 *
 * 注意**没有**设置 `novalidate`：拦下提交的仍然是浏览器自己，这样 `form.submit()`、
 * 回车提交、脚本提交三条路径的行为一致，不需要组件复刻一套提交判定。
 */
const props = defineProps({
  // 函数类 prop 用运行时声明：类型写法会把函数推断成 Function 单一类型，
  // 与字符串混用的取值（例如 Message 的 match）会被误判。
  onClearServerErrors: { type: Function as PropType<() => void>, default: undefined },
  as: { type: String, default: 'form' },
  asChild: { type: Boolean, default: false },
});

const form = useForm({
  onClearServerErrors: () => props.onClearServerErrors?.(),
});

provide('form', form);
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    data-part="root"
    @invalid="form.onFormInvalid"
    @submit="form.onFormSubmit"
    @reset="form.onFormReset"
  >
    <slot />
  </Slot>
</template>
