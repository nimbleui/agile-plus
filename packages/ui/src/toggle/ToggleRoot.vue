<script setup lang="ts">
import { computed, toRef } from 'vue';

import { useToggle } from '@agile-plus/headless';

import { Slot } from '../slot';

import type { ToggleRootEmits, ToggleRootProps } from './types';

/**
 * 会保持按下状态的按钮，对应 Radix 的 `Toggle`。
 *
 * 触发元素本身就是开关：`aria-pressed` 与 `data-state="on|off"` 都落在这颗按钮上，
 * 不需要额外的指示器部件（这是它与 Checkbox 的结构性区别）。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ToggleRootProps>(), {
  // pressed 必须显式留 undefined：Boolean prop 缺省会被 cast 成 false，
  // useToggle 用 undefined 判定是否受控，否则非受控用法会被锁死在未按下。
  pressed: undefined,
  defaultPressed: false,
  disabled: false,
  as: 'button',
  asChild: false,
});

const emit = defineEmits<ToggleRootEmits>();

const toggle = useToggle({
  pressed: toRef(() => props.pressed),
  defaultPressed: props.defaultPressed,
  disabled: toRef(() => props.disabled),
  onPressedChange: (pressed) => emit('update:pressed', pressed),
});

// 属性里含 aria-pressed 与 data-state，必须保持响应式：直接取快照会让按下状态不更新。
const rootProps = computed(() => toggle.getRootProps());

defineExpose({
  pressed: toggle.pressed,
  disabled: toggle.disabled,
  setPressed: toggle.setPressed,
  toggle: toggle.toggle,
});
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...rootProps, ...$attrs }"
    data-part="root"
    @click="toggle.onClick"
  >
    <slot :pressed="toggle.pressed" />
  </Slot>
</template>
