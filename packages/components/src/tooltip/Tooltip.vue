<script setup lang="ts">
import { computed } from 'vue';

import { TooltipArrow, TooltipContent, TooltipRoot, TooltipTrigger } from '@agile-plus/ui/tooltip';

import type { PropType } from 'vue';

import type { FloatingOffset, FloatingPlacement, FloatingStrategy } from '@agile-plus/ui';

/**
 * 带样式的 Tooltip。
 *
 * 封装 ui 层的四个部件并注入样式：`trigger` 插槽放触发元素的文字（button 由本层渲染），
 * 提示正文用默认插槽。触发元素不被施加视觉样式——它通常是消费者页面里的按钮，
 * 外观该由使用方决定。
 *
 * 箭头默认开启。这里把 ui 层的 `arrow` 对象选项收成 `showArrow` + `arrowSize` 两个直观
 * 属性：成品层的消费者不需要知道箭头偏移是怎么算的，只需要决定要不要、多大。
 *
 * 浮层**首次打开才挂载、打开过一次之后常驻**（`keepMounted` 默认为真）：关闭只切成
 * `data-state="closed"`，重开不必重建 DOM 与重新测量。要回到「关闭即卸载」就把
 * `keepMounted` 关掉。
 *
 * 布尔属性用运行时声明并显式 default: undefined，理由与 Dialog 相同：
 * `open` 被转成 false 会让非受控用法永远打不开，`flip`/`shift` 被转成 false 会
 * 覆盖无头层自己的 true 默认值，让位置自适应静默失效。
 */
const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  delayDuration: { type: Number, default: undefined },
  skipDelayDuration: { type: Number, default: undefined },
  disableHoverableContent: { type: Boolean, default: false },
  placement: { type: String as PropType<FloatingPlacement>, default: undefined },
  offset: { type: [Number, Object] as PropType<number | FloatingOffset>, default: undefined },
  flip: { type: Boolean, default: undefined },
  shift: { type: Boolean, default: undefined },
  padding: { type: Number, default: undefined },
  strategy: { type: String as PropType<FloatingStrategy>, default: undefined },
  container: { type: [String, Object] as PropType<string | HTMLElement>, default: 'body' },
  forceMount: { type: Boolean, default: false },
  /** 缺省常驻，理由见组件注释；无头层判定在 useKeepMounted，本层只做透传。 */
  keepMounted: { type: Boolean, default: true },
  showArrow: { type: Boolean, default: true },
  arrowSize: { type: Number, default: 8 },
  /**
   * 触发器不渲染自身的 button，把属性与事件合并到 trigger 插槽里的唯一元素上。
   *
   * 缺省 false：插槽里放纯文本时 asChild 会抛错（它要求恰好一个元素子节点），
   * 默认渲染 button 才能让「给一段文字加提示」这种最常见写法直接成立。
   */
  triggerAsChild: { type: Boolean, default: false },
});

const emit = defineEmits<{ 'update:open': [value: boolean] }>();

defineSlots<{
  /**
   * 触发元素的文字。这一层默认已经渲染了 button，这里不要再放一个 `<button>`：
   * 嵌套交互元素是非法 HTML，且 `focus` 不冒泡，Tab 落在内层时键盘触发会失效。
   *
   * 要用消费者自己的元素当触发器，开 `triggerAsChild` 并只放恰好一个可聚焦元素。
   */
  trigger(): unknown;
  /** 提示正文 */
  default(): unknown;
}>();

/**
 * 只把属于 Root 的属性交下去。
 *
 * `container` 归 Content 的 Teleport，`forceMount` / `keepMounted` 归 Content 的
 * usePresence，`showArrow` / `arrowSize` 已在下面折成 Root 的 `arrow` 对象，
 * `triggerAsChild` 归 Trigger 的 asChild——Root 都没声明这些键，整包 `v-bind="props"`
 * 会让它们在只有 slot 根的 Root 上变成无处落地的透传属性，dev 下报
 * Extraneous non-props attributes。
 */
const rootProps = computed(() => ({
  open: props.open,
  defaultOpen: props.defaultOpen,
  delayDuration: props.delayDuration,
  skipDelayDuration: props.skipDelayDuration,
  disableHoverableContent: props.disableHoverableContent,
  placement: props.placement,
  offset: props.offset,
  flip: props.flip,
  shift: props.shift,
  padding: props.padding,
  strategy: props.strategy,
}));
</script>

<template>
  <TooltipRoot
    v-bind="rootProps"
    :arrow="props.showArrow ? { size: props.arrowSize, padding: 4 } : undefined"
    @update:open="(v) => emit('update:open', v)"
  >
    <TooltipTrigger :as-child="props.triggerAsChild">
      <slot name="trigger" />
    </TooltipTrigger>

    <TooltipContent
      class="y-tooltip"
      :container="props.container"
      :force-mount="props.forceMount"
      :keep-mounted="props.keepMounted"
    >
      <slot />

      <TooltipArrow v-if="props.showArrow" class="y-tooltip__arrow" />
    </TooltipContent>
  </TooltipRoot>
</template>

<style lang="scss">
@use './Tooltip.scss';
</style>
