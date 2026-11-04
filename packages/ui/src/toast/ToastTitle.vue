<script setup lang="ts">
import { Slot } from '../slot';

import type { ToastTitleProps } from './types';

// Slot 自身不继承 attrs，消费者传入的 class / style 必须显式并入。
defineOptions({ inheritAttrs: false });

/**
 * 通知标题。
 *
 * 与 Radix 一样只是个带钩子的容器：朗读文本由 announcer 从 DOM 直接收集，所以
 * 不需要 id，也不与通知本体建立 aria 关联。
 */
const props = withDefaults(defineProps<ToastTitleProps>(), {
  as: 'div',
  asChild: false,
});
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="$attrs" data-part="title">
    <slot />
  </Slot>
</template>
