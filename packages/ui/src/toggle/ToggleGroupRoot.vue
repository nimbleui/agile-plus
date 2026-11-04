<script setup lang="ts">
import { computed, provide, toRef } from 'vue';

import { useToggleGroup } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { ToggleGroupRootEmits, ToggleGroupRootProps } from './types';

/**
 * 开关按钮组，对应 Radix 的 `ToggleGroup`。
 *
 * 与 RadioGroup 的关键区别：**单选组允许一项都不选**（再次点击已选中项会取消），
 * 因此它的值可以是空字符串，而 RadioGroup 必须始终有一个值。
 *
 * role 由 `type` 决定：`single` → `radiogroup`，`multiple` → `toolbar`，与 Radix 一致。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ToggleGroupRootProps>(), {
  value: undefined,
  defaultValue: undefined,
  disabled: false,
  // 这两个默认值必须是 true：Boolean prop 缺省会被 cast 成 false，
  // 罗盘焦点与绕回会静默关闭，键盘行为与 Radix 不一致。
  rovingFocus: true,
  loop: true,
  orientation: undefined,
  dir: undefined,
  as: 'div',
  asChild: false,
});

const emit = defineEmits<ToggleGroupRootEmits>();

const group = useToggleGroup({
  type: toRef(() => props.type),
  value: toRef(() => props.value),
  defaultValue: props.defaultValue,
  disabled: toRef(() => props.disabled),
  rovingFocus: toRef(() => props.rovingFocus),
  loop: toRef(() => props.loop),
  orientation: toRef(() => props.orientation),
  dir: toRef(() => props.dir),
  onValueChange: (value) => emit('update:value', value),
});

provide('toggleGroup', group);

const rootProps = computed(() => group.getGroupProps());
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...rootProps, ...$attrs }"
    data-part="root"
    @focus="group.onGroupFocus"
    @blur="group.onGroupBlur"
    @mousedown="group.onGroupMousedown"
  >
    <slot />
  </Slot>
</template>
