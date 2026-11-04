<script setup lang="ts">
import { computed, inject, provide, toRef, watchEffect, type PropType } from 'vue';

import { useCheckbox } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { CheckboxCheckedState } from '@agile-plus/primitives/checkbox';

import type { UseCheckboxGroupReturn } from '@agile-plus/headless';

import type { CheckboxRootEmits } from './types';

/**
 * Checkbox 根组件。
 *
 * 独立使用时持有自己的三态；落在 CheckboxGroupRoot 内时勾选状态改由组的值数组派生，
 * 此时必须提供 value，字段名则由组下发（各项共用同一个 name，提交得到同名多值）。
 *
 * 模板有两个根节点：触发按钮，以及紧随其后的隐藏 input。input 必须是兄弟节点而不是
 * 按钮的子节点——`<button>` 内不允许出现交互元素——它靠内联样式覆盖在按钮之上，
 * 因此不收进任何插槽，`asChild` 替换渲染目标时它仍然存在。
 *
 * 消费者传入的 class / style 只落到按钮上（`inheritAttrs: false` + 显式并入）。
 */
/**
 * 必须用运行时声明显式给出 default: undefined。
 *
 * 类型写法下 Vue 会把 `boolean | 'indeterminate'` 推断为 Boolean prop，而 Boolean prop
 * 在缺失时被转成 false 而不是 undefined；受控判定依赖 undefined，于是所有不绑定
 * v-model:checked 的复选框都会被误判成「受控且恒为 false」，永远点不动。
 */
const props = defineProps({
  checked: { type: [Boolean, String] as PropType<CheckboxCheckedState>, default: undefined },
  defaultChecked: { type: [Boolean, String] as PropType<CheckboxCheckedState>, default: false },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  value: { type: String, default: undefined },
  id: { type: String, default: undefined },
  as: { type: String, default: 'button' },
  asChild: { type: Boolean, default: false },
});

// Slot 自身不继承 attrs，消费者传入的 class / style 必须显式并入，
// 否则带样式层拿不到挂载类名的元素。
defineOptions({ inheritAttrs: false });

const emit = defineEmits<CheckboxRootEmits>();

const group = inject<UseCheckboxGroupReturn | undefined>('checkboxGroup', undefined);

// 组内省略 value 时多项都会落到默认的 'on' 上，勾选互相覆盖且无法定位到具体项，
// 属于开发期用法错误，因此直接抛错而不是静默产生错乱的数据。
if (group && props.value === undefined) {
  throw new Error(
    'CheckboxRoot 在 CheckboxGroup 内必须提供 value，且同组内不可重复，否则多项会共用默认值 "on" 导致勾选互相覆盖。'
  );
}

/**
 * 组内模式的 checked 是派生值，因此不进入 v-model:checked：
 * 唯一的写入路径是组的值数组，避免出现两个都能改状态的真源。
 */
const checkbox = useCheckbox(
  group
    ? {
        checked: () => (props.value ? group.isValueChecked(props.value) : false),
        onCheckedChange: (next) => {
          if (props.value) group.setItemChecked(props.value, next);
        },
        disabled: () => group.isDisabled.value || props.disabled === true,
        required: toRef(() => props.required),
        // name 由组统一给出，input 仍然由本项渲染：组容器上没有第二个 input。
        name: () => group.name.value,
        value: toRef(() => props.value),
        id: toRef(() => props.id),
      }
    : {
        checked: toRef(() => props.checked),
        defaultChecked: props.defaultChecked,
        onCheckedChange: (value) => emit('update:checked', value),
        disabled: toRef(() => props.disabled),
        required: toRef(() => props.required),
        name: toRef(() => props.name),
        value: toRef(() => props.value),
        id: toRef(() => props.id),
      }
);

provide('checkbox', checkbox);

const rootProps = computed(() => checkbox.getRootProps());

const inputProps = computed(() => checkbox.getInputProps());

/**
 * 半选只能通过 DOM property 表达：`indeterminate` 不是 attribute，
 * 写进模板不会生效，必须在元素引用上直接赋值。
 */
watchEffect(() => {
  const input = checkbox.inputElement.value;

  if (input) input.indeterminate = checkbox.checked.value === 'indeterminate';
});

defineExpose({
  checked: checkbox.checked,
  setChecked: checkbox.setChecked,
  toggle: checkbox.toggle,
});
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="checkbox.setControl"
    v-bind="{ ...rootProps, ...$attrs }"
    data-part="root"
    @click="checkbox.onRootClick"
  >
    <slot />
  </Slot>

  <input v-if="inputProps" :ref="checkbox.setInputElement" v-bind="inputProps" data-part="input" />
</template>
