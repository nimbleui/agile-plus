<script setup lang="ts">
import { computed } from 'vue';

import { useKeepMounted, usePresence } from '@agile-plus/headless';

import { parsePlacement } from '@agile-plus/primitives/floating';

import { useComponentContext } from '../context';

import type { SelectContentProps } from './types';

/**
 * Select 的列表容器。
 *
 * **懒渲染**：关闭时不挂载（`v-if` 由共享 usePresence 驱动），打开才渲染，给了退场
 * 动画就等动画结束再卸载。`keepMounted` 让列表打开过一次之后常驻，滚动位置与临时
 * 状态留得住；常驻时 closed 状态要由样式层负责藏干净。关闭态的回显 / typeahead /
 * 隐藏原生 select 选项不依赖挂载，由 useSelect 的持久选项快照缓存承担，因此两种
 * 渲染策略都不丢这三条路径。
 *
 * 定位样式与两个测量变量是测量结果，必须内联；这与「无样式层零视觉样式」不冲突——
 * 它只表达位置与可用空间，颜色、圆角、阴影仍由样式层负责。
 */
// Teleport 不是真实元素，class 与 style 必须显式绑到内部 div。
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SelectContentProps>(), {
  container: 'body',
  keepMounted: false,
});

const select = useComponentContext('select');

const retention = useKeepMounted({ open: select.isOpen, enabled: () => props.keepMounted });

const presence = usePresence({
  present: () => retention.keepMounted.value || select.isOpen.value,
});

const contentProps = computed(() => select.getContentProps());

/** 实际所在边：翻转后可能与请求的 placement 不同，样式层据此决定进场方向与圆角。 */
const side = computed(() => parsePlacement(select.floating.placement.value).side);

/**
 * 一个元素要同时交给 presence 与 floating，而 :ref 只能绑一个，因此用函数 ref 分发。
 * presence 需要它判动画，floating 需要它量尺寸。
 */
function setContentElement(node: unknown): void {
  presence.setElement(node);
  select.setContentElement(node);
}
</script>

<template>
  <Teleport :to="props.container">
    <div
      v-if="presence.isPresent.value"
      :ref="setContentElement"
      v-bind="{ ...contentProps, ...$attrs }"
      :style="select.contentStyle.value"
      :data-side="side"
      data-part="content"
      @pointerdown="select.onContentPointerDown"
      @pointerleave="select.onContentPointerLeave"
    >
      <slot />
    </div>
  </Teleport>
</template>
