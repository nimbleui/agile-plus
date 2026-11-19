<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, toRef, useId } from 'vue';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { SelectItemProps } from './types';

/**
 * Select 的选项。
 *
 * 渲染成 role="option" 的元素，选中态由列表的值派生，因此本组件不持有第二份真值。
 * 注册必须在 setup 执行：注册顺序即键盘导航与 typeahead 的匹配顺序，放进属性求值
 * 函数会让 computed 产生副作用并触发递归更新。
 *
 * 元素本身不可聚焦（焦点模型要求焦点留在触发元素上），高亮通过 data-highlighted 与
 * 触发元素的 aria-activedescendant 表达，而不是 roving tabindex。
 */
const props = withDefaults(defineProps<SelectItemProps>(), {
  disabled: false,
  textValue: undefined,
  as: 'div',
  asChild: false,
});

const select = useComponentContext('select');

const localId = useId();
const id = select.getItemId(localId);

const element = ref<HTMLElement | null>(null);

/** ItemText 上报的文本；给了 textValue 属性时以属性为准。 */
const reportedText = ref('');

const textValue = computed(() => props.textValue ?? reportedText.value);

const isSelected = computed(() => select.value.value === props.value);

const unregister = select.registerItem({
  id,
  value: toRef(() => props.value),
  disabled: toRef(() => props.disabled),
  textValue,
  element,
});

onBeforeUnmount(unregister);

/**
 * 向内部部件提供项级上下文。
 *
 * 插槽内容是在本组件的 render 过程中被渲染的，因此写在消费者模板里的 ItemText /
 * Indicator 能沿 provides 链取到它；外层封装组件把它们放进传给本组件的插槽里同样成立。
 */
provide('selectItem', {
  isSelected,
  setTextValue: (text: string) => {
    reportedText.value = text;
  },
});

const itemProps = computed(() => select.getItemProps(props.value));

function setElement(node: unknown): void {
  element.value = node instanceof HTMLElement ? node : null;
}

/**
 * aria-disabled 不是原生 disabled，浏览器仍会派发 click，因此选中逻辑在无头层再挡
 * 一次；这里只负责把指针移动与点击交出去，不重复实现禁用判断。
 */
function onPointerMove(): void {
  select.onItemPointerMove(props.value);
}

function onClick(): void {
  select.onItemClick(props.value);
}
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    :el-ref="setElement"
    v-bind="itemProps"
    data-part="item"
    @pointermove="onPointerMove"
    @click="onClick"
  >
    <slot />
  </Slot>
</template>
