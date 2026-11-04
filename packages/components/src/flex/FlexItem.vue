<script setup lang="ts">
import { FlexItem } from '@agile-plus/ui/flex';

import type { FlexItemProps } from '@agile-plus/ui';

/**
 * 带样式的 Flex 单项。
 *
 * 用于覆盖单项在容器中的占位与交叉轴对齐；不传任何覆盖项时只是一个带
 * `.y-flex-item` 类名的普通元素，与直接用 div 无差异，此时可以省略本组件。
 *
 * @example
 * ```vue
 * <Flex>
 *   <FlexItem :grow="1">撑满剩余空间</FlexItem>
 *   <FlexItem alignSelf="end">单独底部对齐</FlexItem>
 * </Flex>
 * ```
 */
withDefaults(defineProps<FlexItemProps>(), {
  as: 'div',
  asChild: false,
});

defineSlots<{
  default(): unknown;
}>();
</script>

<template>
  <FlexItem v-bind="$props" class="y-flex-item">
    <slot />
  </FlexItem>
</template>

<style lang="scss">
@use './Flex.scss';
</style>
