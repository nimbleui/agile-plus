<script setup lang="ts">
import { computed, onMounted, onUpdated, ref, toRef, watch } from 'vue';

import { useEllipsis } from '@agile-plus/headless';

import { TooltipContent, TooltipRoot, TooltipTrigger } from '../tooltip';

import type { PropType } from 'vue';

import type { EllipsisMode } from '@agile-plus/primitives/ellipsis';

import type { UseEllipsisReturn } from '@agile-plus/headless';

/**
 * 文本省略组件。
 *
 * 结构分两层：外层是 Tooltip 的触发盒（asChild 会把 Tooltip 自己的 data-part /
 * data-state 合并到它上面），内层才是**被测量的截断元素**，保留 ellipsis 自己的
 * data-part / data-mode / data-state。不能把截断元素直接交给 TooltipTrigger asChild：
 * 那会让 Tooltip 的属性覆盖掉测量元素的标识与状态。
 *
 * 三种模式：single / multi 内层就是截断元素；middle 外层触发盒是 flex 容器，head
 * （完整文本）收缩出省略号、tail 固定保留末尾字符。tail 是 head 的重复副本，因此
 * aria-hidden 且不可选中，读屏与复制都只拿到一份完整文本。
 *
 * Tooltip 始终挂载但用受控 open 闸门住：只有溢出且未展开时才允许打开。结构稳定是
 * 测量稳定的前提——按 overflow 条件 remount 截断元素会让测量读到新节点的 0 尺寸后
 * 又判不溢出，来回振荡。
 *
 * 溢出时把触发盒设为可聚焦：键盘用户 Tab 到截断文本即可读全文。未溢出时不加
 * tabindex，避免把普通文本变成多余的 Tab 落点。
 *
 * 功能性内联样式（截断 / flex / 不可选中）由无头层产出：截断是行为不是装饰，保证
 * 不引 CSS 也能正确省略；颜色 / 字号 / 间距仍留给样式层。
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
  mode: { type: String as PropType<EllipsisMode>, default: 'single' },
  lines: { type: Number, default: undefined },
  tailChars: { type: Number, default: undefined },
  expandable: { type: Boolean, default: false },
  expandText: { type: String, default: '展开' },
  collapseText: { type: String, default: '收起' },
  tooltip: { type: Boolean, default: true },
  expanded: { type: Boolean, default: undefined },
  defaultExpanded: { type: Boolean, default: false },
});

const emit = defineEmits<{ 'update:expanded': [value: boolean] }>();

const ellipsis = useEllipsis({
  mode: toRef(() => props.mode),
  lines: toRef(() => props.lines),
  tailChars: toRef(() => props.tailChars),
  expanded: toRef(() => props.expanded),
  defaultExpanded: props.defaultExpanded,
  onExpandedChange: (value) => emit('update:expanded', value),
});

const isMiddle = computed(() => ellipsis.mode.value === 'middle');

/** 是否允许 Tooltip 打开：溢出且未展开且消费者没关 tooltip。 */
const allowTooltip = computed(
  () => props.tooltip && ellipsis.isOverflow.value && !ellipsis.expanded.value
);

const tooltipOpen = ref(false);

/** 受控 open 的闸门：不允许时把任何打开请求压回 false。 */
function onTooltipOpenChange(value: boolean): void {
  tooltipOpen.value = value && allowTooltip.value;
}

watch(allowTooltip, (allowed) => {
  if (!allowed) tooltipOpen.value = false;
});

/** 触发盒布局：middle 未展开时是 flex 容器，其它模式是块级盒让内层撑满宽度。 */
const triggerStyle = computed(() =>
  isMiddle.value && !ellipsis.expanded.value ? ellipsis.wrapperStyle.value : { display: 'block' }
);

const wrapperEl = ref<HTMLElement | null>(null);
const headEl = ref<HTMLElement | null>(null);

function setWrapper(node: unknown): void {
  wrapperEl.value = node instanceof HTMLElement ? node : null;

  ellipsis.setContentElement(node);
}

function setHead(node: unknown): void {
  headEl.value = node instanceof HTMLElement ? node : null;

  ellipsis.setContentElement(node);
}

/** 上报完整文本：middle 读 head（触发盒含 tail 副本），其它模式读内层截断元素。 */
function report(): void {
  const source = isMiddle.value ? headEl.value : wrapperEl.value;

  ellipsis.setText(source?.textContent ?? '');
}

onMounted(report);
onUpdated(report);

defineExpose({
  isOverflow: ellipsis.isOverflow,
  expanded: ellipsis.expanded,
  toggleExpanded: ellipsis.toggleExpanded,
  measure: ellipsis.measure,
} satisfies Partial<UseEllipsisReturn>);
</script>

<template>
  <TooltipRoot :open="tooltipOpen" @update:open="onTooltipOpenChange">
    <TooltipTrigger as-child>
      <span v-bind="$attrs" :style="triggerStyle" :tabindex="allowTooltip ? 0 : undefined">
        <template v-if="isMiddle">
          <span
            :ref="setHead"
            data-part="content"
            :data-mode="ellipsis.mode.value"
            :data-state="ellipsis.dataState.value"
            :style="ellipsis.contentStyle.value"
          >
            <slot />
          </span>
          <span data-part="tail" aria-hidden="true" :style="ellipsis.tailStyle.value">
            {{ ellipsis.tailText.value }}
          </span>
        </template>
        <span
          v-else
          :ref="setWrapper"
          data-part="content"
          :data-mode="ellipsis.mode.value"
          :data-state="ellipsis.dataState.value"
          :style="ellipsis.contentStyle.value"
        >
          <slot />
        </span>
      </span>
    </TooltipTrigger>

    <TooltipContent v-if="allowTooltip">
      <slot />
    </TooltipContent>
  </TooltipRoot>

  <button
    v-if="props.expandable && ellipsis.isOverflow.value"
    type="button"
    data-part="expand"
    @click="ellipsis.toggleExpanded"
  >
    {{ ellipsis.expanded.value ? props.collapseText : props.expandText }}
  </button>
</template>
