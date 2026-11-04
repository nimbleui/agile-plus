<script setup lang="ts">
import { Slot } from '../slot';

import type { ToastDescriptionProps } from './types';

// Slot 自身不继承 attrs，消费者传入的 class / style 必须显式并入。
defineOptions({ inheritAttrs: false });

/**
 * 通知描述。
 *
 * 与标题同为带钩子的容器，不参与 aria 关联。
 */
const props = withDefaults(defineProps<ToastDescriptionProps>(), {
  as: 'div',
  asChild: false,
});
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="$attrs" data-part="description">
    <slot />
  </Slot>
</template>
