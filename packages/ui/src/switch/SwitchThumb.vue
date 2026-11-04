<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { SwitchThumbProps } from './types';

// Slot 自身不继承 attrs，消费者传入的 class / style 必须显式并入。
defineOptions({ inheritAttrs: false });

/**
 * 开关的滑块。
 *
 * 与 Checkbox 的 Indicator 不同，滑块**始终挂载**：它是轨道的一部分，位置随父级
 * `data-state` 平移，隐藏它会破坏布局（Radix 的 Thumb 同样常驻）。
 *
 * 这里也输出 `data-state` / `data-disabled`，让消费者不必依赖「父级状态向下传导」
 * 这一 CSS 假设就能单独选中滑块（例如给不同状态换阴影）。
 */
const props = withDefaults(defineProps<SwitchThumbProps>(), {
  as: 'span',
  asChild: false,
});

const switchApi = useComponentContext('switch');

const thumbProps = computed(() => switchApi.getThumbProps());
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...thumbProps, ...$attrs }"
    data-part="thumb"
  >
    <slot />
  </Slot>
</template>
