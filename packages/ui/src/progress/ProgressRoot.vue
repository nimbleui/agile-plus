<script setup lang="ts">
import { computed, provide } from 'vue';

import { getProgressRootAttrs, getProgressVars } from '@agile-plus/primitives/progress';

import { Slot } from '../slot';

import type { ProgressConfig } from '@agile-plus/primitives/progress';

import type { ProgressContext, ProgressRootProps } from './types';

/**
 * 进度条根元素：无样式的轨道容器。
 *
 * 与 Checkbox / Switch 不同，这里没有 headless 层：Progress 不持有状态（进度值唯一
 * 来源是外部数据，Radix 也没有 onChange 与默认值）、不绑事件、不读布局，包一层
 * `useProgress` 只是给 `computed` 换个名字，理由与 Flex 少一层是同一条。
 *
 * 数值通道声明在根节点上：`--y-progress-value` 是无单位比例，样式层用它换算轨道宽度
 * 与条纹位移。自定义属性只向下继承，所以声明在这里、Indicator 作为后代读取；
 * 反过来（在 Indicator 上声明、Root 来用）不成立。
 */
const props = withDefaults(defineProps<ProgressRootProps>(), {
  value: null,
  max: 100,
  as: 'div',
  asChild: false,
});

const config = computed<ProgressConfig>(() => ({
  value: props.value,
  max: props.max,
  getValueLabel: props.getValueLabel,
}));

const rootAttrs = computed(() => getProgressRootAttrs(config.value));

const rootVars = computed(() => getProgressVars(config.value));

provide<ProgressContext>('progress', { config });
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="rootAttrs"
    :style="rootVars"
    data-part="root"
  >
    <slot />
  </Slot>
</template>
