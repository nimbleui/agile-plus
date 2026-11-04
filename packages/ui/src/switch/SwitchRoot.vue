<script setup lang="ts">
import { computed, provide, toRef } from 'vue';

import { useSwitch } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { SwitchRootEmits, SwitchRootProps } from './types';

/**
 * 开关本体。
 *
 * 模板有两个根节点：按钮，以及紧随其后的隐藏 input。input 必须是兄弟节点而不是
 * 按钮的子节点——`<button>` 内不允许出现交互元素；它靠内联样式覆盖在按钮之上，
 * 因此这里不把它收进任何插槽，也不允许 `asChild` 把它一并替换掉。
 *
 * 消费者传入的 class / style 只落到按钮上（`inheritAttrs: false` + 显式并入）。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SwitchRootProps>(), {
  // checked 必须显式留 undefined：Boolean prop 缺省会被 cast 成 false，
  // useSwitch 用 undefined 判定是否受控，否则非受控用法会被锁死在关闭状态。
  checked: undefined,
  defaultChecked: false,
  disabled: false,
  required: false,
  name: undefined,
  value: undefined,
  form: undefined,
  id: undefined,
  as: 'button',
  asChild: false,
});

const emit = defineEmits<SwitchRootEmits>();

const switchApi = useSwitch({
  checked: toRef(() => props.checked),
  defaultChecked: props.defaultChecked,
  disabled: toRef(() => props.disabled),
  required: toRef(() => props.required),
  name: toRef(() => props.name),
  value: toRef(() => props.value),
  id: toRef(() => props.id),
  form: toRef(() => props.form),
  onCheckedChange: (value) => emit('update:checked', value),
});

provide('switch', switchApi);

const rootProps = computed(() => switchApi.getRootProps());
const inputProps = computed(() => switchApi.getInputProps());

defineExpose({
  checked: switchApi.checked,
  disabled: switchApi.isDisabled,
  setChecked: switchApi.setChecked,
  toggle: switchApi.toggle,
});
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="switchApi.setControl"
    v-bind="{ ...rootProps, ...$attrs }"
    data-part="root"
    @click="switchApi.onRootClick"
  >
    <slot :checked="switchApi.checked" />
  </Slot>

  <input v-if="inputProps" :ref="switchApi.setInputElement" v-bind="inputProps" data-part="input" />
</template>
