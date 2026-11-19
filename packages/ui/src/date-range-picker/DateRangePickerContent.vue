<script setup lang="ts">
import { computed } from 'vue';

import { useKeepMounted, usePresence } from '@agile-plus/headless';

import { parsePlacement } from '@agile-plus/primitives/floating';

import { useComponentContext } from '../context';

import type { DateRangePickerContentProps } from './types';

/**
 * DateRangePicker 的面板容器。
 *
 * 懒渲染 + keepMounted 常驻策略与 DatePickerContent 完全一致；定位样式是测量
 * 结果必须内联，颜色、圆角、阴影仍由样式层负责。
 */
// Teleport 不是真实元素，class 与 style 必须显式绑到内部 div。
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<DateRangePickerContentProps>(), {
  container: 'body',
  keepMounted: false,
});

const picker = useComponentContext('dateRangePicker');

const retention = useKeepMounted({ open: picker.isOpen, enabled: () => props.keepMounted });

const presence = usePresence({
  present: () => retention.keepMounted.value || picker.isOpen.value,
});

const contentProps = computed(() => picker.getContentProps());

/** 实际所在边：翻转后可能与请求的 placement 不同，样式层据此决定进场方向。 */
const side = computed(() => parsePlacement(picker.floating.placement.value).side);

/** 一个元素同时交给 presence 与 floating，用函数 ref 分发。 */
function setContentElement(node: unknown): void {
  presence.setElement(node);
  picker.setContentElement(node);
}
</script>

<template>
  <Teleport :to="props.container">
    <div
      v-if="presence.isPresent.value"
      :ref="setContentElement"
      v-bind="{ ...contentProps, ...$attrs }"
      :style="picker.contentStyle.value"
      :data-side="side"
      data-part="content"
    >
      <slot />
    </div>
  </Teleport>
</template>
