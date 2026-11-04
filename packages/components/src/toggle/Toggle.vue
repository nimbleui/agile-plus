<script setup lang="ts">
import { ToggleRoot } from '@agile-plus/ui/toggle';

import type { ToggleRootEmits } from '@agile-plus/ui';

/**
 * 带样式的开关按钮，对应 Radix 的 `Toggle`。
 *
 * 外观全部由 `data-state="on|off"` 与禁用状态驱动，不额外提供 variant / size：
 * 与本库其它带样式组件保持一致，需要更强视觉差异时用 UI 层自己配样式。
 */
const props = defineProps({
  pressed: { type: Boolean, default: undefined },
  defaultPressed: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  as: { type: String, default: 'button' },
  asChild: { type: Boolean, default: false },
});

const emit = defineEmits<ToggleRootEmits>();
</script>

<template>
  <ToggleRoot
    v-bind="props"
    class="y-toggle"
    @update:pressed="(value) => emit('update:pressed', value)"
  >
    <slot />
  </ToggleRoot>
</template>

<style lang="scss">
@use './Toggle.scss';
</style>
