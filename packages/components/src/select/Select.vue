<script setup lang="ts">
import { computed, ref } from 'vue';

import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from '@agile-plus/ui/select';

import type { PropType } from 'vue';

import type {
  FloatingOffset,
  FloatingPlacement,
  FloatingStrategy,
  SelectOptionItem,
} from '@agile-plus/ui';

import type { SelectSize, SelectVariant } from './types';

/**
 * 带样式的下拉选择器。
 *
 * 预置 Trigger / Value / Icon / Content / Viewport / Item 六段结构，选项既可以用
 * `options` 数据驱动，也可以用默认插槽自己摆（分组、分隔线、富内容都走这条路）。
 *
 * 外层多包一个 `<span class="y-select">` 而不是把 class 直接挂在触发按钮上，有两个
 * 实在的理由：隐藏原生 select 与清除按钮都是触发按钮的**兄弟节点**（`<button>` 内不
 * 允许再放交互元素），它们靠绝对定位覆盖在按钮上，需要一个 `position: relative` 的
 * 共同父级；同时这个父级也是宽度（`block`）与尺寸变量的落点。
 *
 * 列表被 portal 到 body，读不到 `.y-select` 上声明的自定义属性，因此变量表在
 * `.y-select` 与 `.y-select-content` 两个 Block 上各声明一次——与 Toast / ToastViewport
 * 同一条约束。
 *
 * 列表**首次打开才挂载、打开过一次之后常驻**（`keepMounted` 默认为真）：关闭只切成
 * `data-state="closed"`，列表的滚动位置留得住，重开也不必重建 DOM。要回到
 * 「关闭即卸载」就把 `keepMounted` 关掉。
 *
 * 布尔属性用运行时声明并显式 default: undefined：`open` 被转成 false 会让非受控用法
 * 永远打不开，`flip` / `shift` 被转成 false 会覆盖无头层自己的 true 默认值。
 */
const props = defineProps({
  modelValue: { type: String, default: undefined },
  defaultValue: { type: String, default: '' },
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  options: { type: Array as PropType<SelectOptionItem[]>, default: () => [] },
  placeholder: { type: String, default: '请选择' },
  size: { type: String as PropType<SelectSize>, default: 'middle' },
  variant: { type: String as PropType<SelectVariant>, default: 'outlined' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  clearable: { type: Boolean, default: false },
  clearLabel: { type: String, default: '清除选择' },
  loading: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  form: { type: String, default: undefined },
  loop: { type: Boolean, default: true },
  typeaheadTimeout: { type: Number, default: undefined },
  ariaLabelledby: { type: String, default: undefined },
  ariaDescribedby: { type: String, default: undefined },
  placement: { type: String as PropType<FloatingPlacement>, default: undefined },
  offset: { type: [Number, Object] as PropType<number | FloatingOffset>, default: undefined },
  flip: { type: Boolean, default: undefined },
  shift: { type: Boolean, default: undefined },
  padding: { type: Number, default: undefined },
  strategy: { type: String as PropType<FloatingStrategy>, default: undefined },
  container: { type: [String, Object] as PropType<string | HTMLElement>, default: 'body' },
  /** 缺省常驻，理由见组件注释；无头层判定在 useKeepMounted，本层只做透传。 */
  keepMounted: { type: Boolean, default: true },
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:open': [value: boolean];
  clear: [];
}>();

defineSlots<{
  /** 自定义选项列表；写了它就完全接管 options，分组与分隔线走这条路 */
  default(): unknown;
  /** 选中值回显；不写则显示选项文本 */
  value(props: { value: string; label: string }): unknown;
  /** 单个选项的文本内容 */
  item(props: { option: SelectOptionItem }): unknown;
  /** 没有选项时的提示 */
  empty(): unknown;
}>();

/** 只把属于 Root 的属性交下去：尺寸、外观、清除这些是本层自己的视觉决定。 */
const rootProps = computed(() => ({
  options: props.options,
  modelValue: props.modelValue,
  defaultValue: props.defaultValue,
  open: props.open,
  defaultOpen: props.defaultOpen,
  disabled: props.disabled,
  required: props.required,
  name: props.name,
  form: props.form,
  loop: props.loop,
  typeaheadTimeout: props.typeaheadTimeout,
  ariaLabelledby: props.ariaLabelledby,
  ariaDescribedby: props.ariaDescribedby,
  placement: props.placement,
  offset: props.offset,
  flip: props.flip,
  shift: props.shift,
  padding: props.padding,
  strategy: props.strategy,
}));

const rootRef = ref<{ value: string; setValue(value: string): void } | null>(null);

/** label 缺省回落到 value：数据里只给了 value 时也能正常显示与搜索。 */
const normalizedOptions = computed<SelectOptionItem[]>(() =>
  props.options.map((option) => ({ ...option, label: option.label ?? option.value }))
);

const hasValue = computed(() => (rootRef.value?.value ?? '') !== '');

const showClear = computed(
  () => props.clearable && hasValue.value && !props.disabled && !props.loading
);

function onClear(): void {
  rootRef.value?.setValue('');

  emit('clear');
}
</script>

<template>
  <SelectRoot
    v-bind="rootProps"
    ref="rootRef"
    @update:model-value="(value) => emit('update:modelValue', value)"
    @update:open="(value) => emit('update:open', value)"
  >
    <span
      :class="[
        'y-select',
        `y-select--${props.size}`,
        `y-select--${props.variant}`,
        { 'is-block': props.block },
      ]"
    >
      <SelectTrigger class="y-select__trigger">
        <SelectValue class="y-select__value" :placeholder="props.placeholder">
          <template v-if="$slots.value" #default="slotProps">
            <slot name="value" v-bind="slotProps" />
          </template>
        </SelectValue>

        <span v-if="props.loading" class="y-select__spinner" aria-hidden="true" />

        <SelectIcon v-else class="y-select__icon">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M2.5 4.5 6 8l3.5-3.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </SelectIcon>
      </SelectTrigger>

      <button
        v-if="showClear"
        type="button"
        class="y-select__clear"
        :aria-label="props.clearLabel"
        @click="onClear"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M2 2l6 6M8 2l-6 6"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </span>

    <SelectContent
      :class="['y-select-content', `y-select-content--${props.size}`]"
      :container="props.container"
      :keep-mounted="props.keepMounted"
    >
      <SelectViewport class="y-select-content__viewport">
        <slot>
          <SelectItem
            v-for="option in normalizedOptions"
            :key="option.value"
            :value="option.value"
            :disabled="option.disabled"
            :text-value="option.label"
            class="y-select-content__item"
          >
            <SelectItemIndicator class="y-select-content__indicator">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M2.5 6.3 4.7 8.5 9.5 3.6"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </SelectItemIndicator>

            <SelectItemText class="y-select-content__item-text">
              <slot name="item" :option="option">{{ option.label }}</slot>
            </SelectItemText>
          </SelectItem>

          <p v-if="normalizedOptions.length === 0" class="y-select-content__empty">
            <slot name="empty">无可用选项</slot>
          </p>
        </slot>
      </SelectViewport>
    </SelectContent>
  </SelectRoot>
</template>

<style lang="scss">
@use './Select.scss';
</style>
