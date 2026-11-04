<script setup lang="ts">
import { FlexRoot } from '@agile-plus/ui/flex';

import type { FlexRootProps } from '@agile-plus/ui';

/**
 * 带样式的 Flex 容器。
 *
 * 只负责补上 `.y-flex` 类名与样式，布局语义仍由无头层的 data-* 钩子表达，
 * 因此同一份结构可以换主题而不改逻辑。
 *
 * @example
 * ```vue
 * <Flex direction="column" align="start" gap="md">
 *   <p>第一项</p>
 *   <p>第二项</p>
 * </Flex>
 * ```
 */
// 与 Tabs / RadioGroup 一致：每一层都显式声明默认值，避免 $props 透传时
// undefined 覆盖 FlexRoot 自身的默认值。
withDefaults(defineProps<FlexRootProps>(), {
  as: 'div',
  asChild: false,
});

defineSlots<{
  default(): unknown;
}>();
</script>

<template>
  <FlexRoot v-bind="$props" class="y-flex">
    <slot />
  </FlexRoot>
</template>

<style lang="scss">
@use './Flex.scss';
</style>
