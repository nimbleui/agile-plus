<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from '@agile-plus/ui/checkbox';

import type { PropType } from 'vue';

import type { CheckboxCheckedState, CheckboxRootEmits } from '@agile-plus/ui';

/**
 * 带样式的复选框，结构对齐 Radix：触发元素本身就是方框，Indicator 是框内的勾或横线。
 *
 * 可见文本不放在本组件内部——Radix 把它交给消费者与 Flex / label 组合，
 * 这样 label 与控件的关联方式（包裹或 for/id）由使用方决定。
 *
 * 用运行时声明并显式 default: undefined：类型写法会把 `boolean | 'indeterminate'`
 * 推断成 Boolean prop，未传入时得到 false，而受控判定依赖 undefined，
 * 结果是「不写 v-model:checked 的复选框永远点不动」。
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

const emit = defineEmits<CheckboxRootEmits>();
</script>

<template>
  <CheckboxRoot
    v-bind="props"
    class="y-checkbox"
    @update:checked="(v) => emit('update:checked', v)"
  >
    <CheckboxIndicator class="y-checkbox__indicator">
      <svg
        data-part="check"
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2.5 6.3 4.7 8.5 9.5 3.6"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>

      <span data-part="dash" class="y-checkbox__dash" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>

<style lang="scss">
@use './Checkbox.scss';
</style>
