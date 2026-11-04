<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, useId, watch } from 'vue';

import { useToggle } from '@agile-plus/headless';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { ToggleGroupItemProps } from './types';

/**
 * 组内的一个开关按钮，对应 Radix 的 `ToggleGroupItem`。
 *
 * 它内部仍然复用 Toggle 的语义（Radix 也是渲染一个 Toggle），差别只在状态来源：
 * `pressed` 是「组的值里是否包含自己」，写回时交给组去增删。因此项上没有 pressed
 * 属性，避免两处真源。
 *
 * `single` 组的项会被换成 radio 语义：`role="radio"` + `aria-checked`，并**移除**
 * `aria-pressed`。同时给出两种状态声明会让读屏在同一控件上听到两套语义，Radix
 * 选择的是替换而不是叠加，这里保持一致。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ToggleGroupItemProps>(), {
  disabled: false,
  as: 'button',
  asChild: false,
});

const group = useComponentContext('toggleGroup');
const id = useId();
const element = ref<HTMLElement | null>(null);

const toggle = useToggle({
  pressed: () => group.isItemPressed(props.value),
  disabled: () => group.disabled.value || props.disabled,
  onPressedChange: (pressed) => group.setItemPressed(props.value, pressed),
});

const focusable = computed(() => !toggle.disabled.value);
const active = computed(() => toggle.pressed.value);

/**
 * 罗盘焦点的登记发生在挂载之后。
 *
 * 组的 Tab 停靠点数量决定组元素自身的 tabIndex，而项在 setup 阶段还不存在元素；
 * 提前登记会让组的 tabIndex 在挂载前就变成 0。`value` 变化时重新登记，保证键盘
 * 导航读到的选中判定跟着新值走。
 */
let unregister: (() => void) | null = null;

function register(): void {
  unregister?.();

  unregister = group.registerItem({ id, value: props.value, element, focusable, active });
}

onMounted(register);

watch(
  () => props.value,
  () => {
    if (unregister) register();
  }
);

onScopeDispose(() => {
  unregister?.();
  unregister = null;
});

/**
 * 交给 Slot 的元素入口。
 *
 * Slot 的 `el-ref` 支持函数形式，且这里要把模板可能给到的非元素值收敛成 null，
 * 直接传 Ref 会因为 HTMLElement 与 Element 的读写类型不兼容而无法赋值。
 */
function setElement(node: unknown): void {
  element.value = node instanceof HTMLElement ? node : null;
}

function onItemMousedown(event: MouseEvent): void {
  group.onItemMousedown(event, id);
}

const rootProps = computed(() => {
  const { 'aria-pressed': ariaPressed, ...rest } = toggle.getRootProps();

  if (group.type.value !== 'single') return { ...rest, 'aria-pressed': ariaPressed };

  return { ...rest, role: 'radio', 'aria-checked': toggle.pressed.value };
});

const itemProps = computed(() => ({ ...group.getItemProps(id), ...rootProps.value }));
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="setElement"
    v-bind="{ ...itemProps, ...$attrs }"
    data-part="item"
    @click="toggle.onClick"
    @keydown="group.onItemKeydown"
    @focus="group.onItemFocus(id)"
    @mousedown="onItemMousedown"
  >
    <slot :pressed="toggle.pressed" />
  </Slot>
</template>
