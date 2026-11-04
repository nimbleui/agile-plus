<script setup lang="ts">
import { ToggleGroupRoot } from '@agile-plus/ui/toggle';

import type { PropType } from 'vue';

import type { ToggleGroupRootEmits } from '@agile-plus/ui';

/**
 * 带样式的一组开关按钮，项被拼接成一段并共享圆角。
 *
 * 样式层不加额外视觉参数：`type`、`rovingFocus`、`loop`、`orientation`、`dir`
 * 与无头层一一对应，值形状由 `type` 决定（single 是字符串，multiple 是数组）。
 */
const props = defineProps({
  type: { type: String as PropType<'single' | 'multiple'>, required: true },
  value: { type: [String, Array] as PropType<string | string[]>, default: undefined },
  defaultValue: { type: [String, Array] as PropType<string | string[]>, default: undefined },
  disabled: { type: Boolean, default: false },
  rovingFocus: { type: Boolean, default: true },
  loop: { type: Boolean, default: true },
  orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: undefined },
  dir: { type: String as PropType<'ltr' | 'rtl'>, default: undefined },
  as: { type: String, default: 'div' },
  asChild: { type: Boolean, default: false },
});

const emit = defineEmits<ToggleGroupRootEmits>();
</script>

<template>
  <ToggleGroupRoot
    v-bind="props"
    class="y-toggle-group"
    @update:value="(value) => emit('update:value', value)"
  >
    <slot />
  </ToggleGroupRoot>
</template>

<style lang="scss">
@use './Toggle.scss';
</style>
