<script setup lang="ts">
import { ref } from 'vue';

import { Accordion, AccordionItem } from '@agile-plus/components/accordion';

const single = ref('item-1');

const multiple = ref<string[]>(['a']);
</script>

<template>
  <div class="accordion-demo">
    <section class="accordion-demo__block">
      <p class="accordion-demo__label">单选 · 可全部收起（collapsible）</p>

      <Accordion v-model:value="single" type="single" collapsible>
        <AccordionItem value="item-1">
          <template #trigger>什么是分层架构？</template>
          <p class="accordion-demo__text">
            primitives → headless → ui → components 四层：纯算法、Vue 适配、无样式契约、带样式成品。
            手风琴的项内部复用 Collapsible，展开动画与高度测量都来自那一层。
          </p>
        </AccordionItem>

        <AccordionItem value="item-2">
          <template #trigger>如何换主题？</template>
          <p class="accordion-demo__text">
            覆盖 --y-* 变量即可，不必改组件源码。单项禁用只挡住该标题的点击与键盘导航。
          </p>
        </AccordionItem>

        <AccordionItem value="item-3" disabled>
          <template #trigger>禁用项（点不动，箭头也跳过它）</template>
          <p class="accordion-demo__text">禁用项不参与展开，也不参与方向键导航。</p>
        </AccordionItem>
      </Accordion>

      <p class="accordion-demo__state">当前展开：{{ single || '（全部收起）' }}</p>
    </section>

    <section class="accordion-demo__block">
      <p class="accordion-demo__label">多选 · 可同时展开多项</p>

      <Accordion v-model:value="multiple" type="multiple">
        <AccordionItem value="a">
          <template #trigger>第一段</template>
          <p class="accordion-demo__text">multiple 模式下展开是追加、收起是移除，互不影响。</p>
        </AccordionItem>

        <AccordionItem value="b">
          <template #trigger>第二段</template>
          <p class="accordion-demo__text">值形状是字符串数组，由 type 决定。</p>
        </AccordionItem>
      </Accordion>

      <p class="accordion-demo__state">当前展开：{{ multiple.join('、') || '（无）' }}</p>
    </section>

    <p class="accordion-demo__hint">
      键盘：聚焦标题后按 ↑ / ↓ 在可用项之间移动焦点（不展开），Home / End 跳首尾，
      Enter / Space 或点击才展开。每个标题都是独立的 Tab 停靠点。
    </p>
  </div>
</template>

<style scoped>
.accordion-demo {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.accordion-demo__block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.accordion-demo__label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.accordion-demo__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}

.accordion-demo__state {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.accordion-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
</style>