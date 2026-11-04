<script setup lang="ts">
import { ProgressIndicator, ProgressRoot } from '@agile-plus/ui/progress';

import type { PropType } from 'vue';

import type { GetProgressValueLabel, ProgressValue } from '@agile-plus/ui';

/**
 * 带样式的进度条，结构对齐 Radix：Root 是轨道，Indicator 是填充段。
 *
 * 没有 `v-model:value`，也没有内部状态：进度条不产生用户输入，值的唯一来源是外部数据。
 * `value` 为 `null`（缺省）或 `NaN` 时是不确定进度，轨道用一段来回扫动的动画表达「正在进行」。
 *
 * 可见文本（例如右侧的百分比）不放在组件内部，由消费者与 Flex / 文本节点自行组合，
 * 与 Checkbox 的label 约定一致。
 *
 * 不开放 `asChild`：本组件在 Root 里预置了 Indicator，替换渲染目标时插槽会出现
 * 「轨道元素 + 指示条」两个子节点，而 Slot 的 asChild 要求恰好一个元素子节点。
 * 需要自定义外层元素时用 `@agile-plus/ui/progress` 自行组合，把 Indicator 放进那唯一的孩子里。
 */
const props = defineProps({
  // value 显式给 null 默认值：不确定进度是 Radix 的缺省态，缺省成 0 会画出一根空轨道。
  value: { type: Number as PropType<ProgressValue>, default: null },
  max: { type: Number, default: 100 },
  getValueLabel: { type: Function as PropType<GetProgressValueLabel>, default: undefined },
  as: { type: String, default: 'div' },
});
</script>

<template>
  <ProgressRoot v-bind="props" class="y-progress">
    <ProgressIndicator class="y-progress__indicator" />
  </ProgressRoot>
</template>

<style lang="scss">
@use './Progress.scss';
</style>
