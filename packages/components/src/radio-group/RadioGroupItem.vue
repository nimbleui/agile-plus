<script setup lang="ts">
import {
  RadioGroupIndicator,
  RadioGroupItem as RadioGroupItemPrimitive,
} from '@agile-plus/ui/radio-group';

import type { RadioGroupItemProps } from '@agile-plus/ui';

/**
 * 带样式的单个选项，命名与 Radix 的 RadioGroup.Item 对齐。
 *
 * UI 层的 RadioGroupItem 只提供行为与 ARIA，DOM 结构（指示圈 + 圆点 + 文本）
 * 由本组件固定，消费者只需给出 value 与标签文本。
 */
const props = withDefaults(defineProps<RadioGroupItemProps>(), {
  disabled: false,
});
</script>

<template>
  <!-- 已声明的 prop 不会出现在 $attrs 中，必须显式绑定 props，否则 item 收不到 value。 -->
  <RadioGroupItemPrimitive v-bind="props" class="y-radio">
    <RadioGroupIndicator class="y-radio__indicator">
      <span class="y-radio__dot" />
    </RadioGroupIndicator>

    <span class="y-radio__label">
      <slot />
    </span>
  </RadioGroupItemPrimitive>
</template>
