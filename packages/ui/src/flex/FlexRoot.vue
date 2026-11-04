<script setup lang="ts">
import { computed } from 'vue';

import { getFlexAttrs, getFlexStyles } from '@agile-plus/primitives';

import { Slot } from '../slot';

import type { FlexRootProps } from './types';

/**
 * Flex 根组件：无样式的弹性容器。
 *
 * 布局值不写进 style，而是输出稳定的 data-* 钩子（data-direction / data-align / ...），
 * 具体 CSS 声明由样式层的属性选择器决定，这是本库「无样式层零样式」契约的落地方式。
 * 只有任意 gap 值无法被有限选择器枚举，才以最小内联声明交给浏览器解析。
 *
 * 无状态、无副作用，因此不需要 provide/inject，也不与 FlexItem 建立父子约束：
 * 单项覆盖全部通过自身的 data-* 与内联声明生效，脱离容器使用不会报错但也不会生效。
 */
const props = withDefaults(defineProps<FlexRootProps>(), {
  as: 'div',
  asChild: false,
});

const flexAttrs = computed(() => getFlexAttrs(props));

const flexStyles = computed(() => getFlexStyles(props));
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="flexAttrs" :style="flexStyles">
    <slot />
  </Slot>
</template>
