<script setup lang="ts">
import { CheckboxGroupRoot } from '@agile-plus/ui/checkbox';

import type { CheckboxGroupRootEmits, CheckboxGroupRootProps } from '@agile-plus/ui';

/**
 * 带样式的多选组，语义对齐 Radix Themes 的 CheckboxGroup.Root。
 *
 * 组持有一个值数组；组内的每一项仍用 Checkbox 并提供唯一的 value，
 * 其勾选状态由数组派生，写入只发生在组上，因此不存在两个真源。
 */
const props = withDefaults(defineProps<CheckboxGroupRootProps>(), {
  // 数组默认值必须用工厂函数返回，否则多实例共享同一引用。
  defaultValue: () => [],
  disabled: false,
  required: false,
  as: 'div',
});

const emit = defineEmits<CheckboxGroupRootEmits>();
</script>

<template>
  <CheckboxGroupRoot
    v-bind="props"
    class="y-checkbox-group"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <slot />
  </CheckboxGroupRoot>
</template>
