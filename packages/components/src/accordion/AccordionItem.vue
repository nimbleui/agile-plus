<script setup lang="ts">
import {
  AccordionContent,
  AccordionItem as UiAccordionItem,
  AccordionTrigger,
} from '@agile-plus/ui/accordion';

/**
 * 带样式的手风琴项，预置 Trigger + Content 两段结构。
 *
 * 与 Collapsible 成品同构：trigger 插槽放标题，默认插槽放展开内容。展开态由组的值
 * 驱动，项上写 open 没有意义。箭头是纯 CSS（::after 两条边），旋转角度读 data-state。
 */
const props = defineProps({
  value: { type: String, required: true },
  disabled: { type: Boolean, default: false },
});

defineSlots<{
  /** 触发按钮的内容（标题） */
  trigger(): unknown;
  /** 展开后的主体内容 */
  default(): unknown;
}>();
</script>

<template>
  <UiAccordionItem v-bind="props" class="y-accordion__item">
    <AccordionTrigger class="y-accordion__trigger">
      <slot name="trigger" />
    </AccordionTrigger>

    <AccordionContent class="y-accordion__content">
      <slot />
    </AccordionContent>
  </UiAccordionItem>
</template>

<style lang="scss">
@use './Accordion.scss';
</style>