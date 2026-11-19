<script setup lang="ts">
import { computed } from 'vue';

import { useKeepMounted, usePresence } from '@agile-plus/headless';

import { parsePlacement } from '@agile-plus/primitives/floating';

import { useComponentContext } from '../context';

import type { DatePickerContentProps } from './types';

/**
 * DatePicker 的面板容器。
 *
 * **懒渲染**：关闭时不挂载（v-if 由共享 usePresence 驱动），打开才渲染，给了退场
 * 动画就等动画结束再卸载。`keepMounted` 让面板打开过一次之后常驻；常驻时 closed
 * 状态要由样式层负责藏干净。
 *
 * 定位样式是测量结果，必须内联；这与「无样式层零视觉样式」不冲突——它只表达
 * 位置，颜色、圆角、阴影仍由样式层负责。
 */
// Teleport 不是真实元素，class 与 style 必须显式绑到内部 div。
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<DatePickerContentProps>(), {
  container: 'body',
  keepMounted: false,
});

const picker = useComponentContext('datePicker');

const retention = useKeepMounted({ open: picker.isOpen, enabled: () => props.keepMounted });

const presence = usePresence({
  present: () => retention.keepMounted.value || picker.isOpen.value,
});

const contentProps = computed(() => picker.getContentProps());

/** 实际所在边：翻转后可能与请求的 placement 不同，样式层据此决定进场方向。 */
const side = computed(() => parsePlacement(picker.floating.placement.value).side);

/**
 * 一个元素要同时交给 presence 与 floating，而 :ref 只能绑一个，因此用函数 ref 分发。
 * presence 需要它判动画，floating 需要它量尺寸。
 */
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
