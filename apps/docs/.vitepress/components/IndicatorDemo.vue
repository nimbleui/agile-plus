<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';

import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '@agile-plus/ui/radio-group';

/**
 * 四种 Indicator 用法的对照演示。
 *
 * 每行末尾的数字来自真实 DOM 查询，而不是组件内部状态：默认挂载与 forceMount
 * 的区别只有数节点才能看出来，asChild 那一行额外打印渲染结果以证明少了一层元素。
 */
const value = ref('default');

const wrapperEl = ref<HTMLElement | null>(null);

const counts = ref<Record<string, number>>({
  default: 0,
  force: 1,
  svg: 0,
  child: 0,
});

const childMarkup = ref('');

function measure(): void {
  const root = wrapperEl.value;

  if (!root) return;

  const next: Record<string, number> = {};

  for (const item of Array.from(root.querySelectorAll('[role="radio"]'))) {
    const key = item.dataset.value ?? '';

    next[key] = item.querySelectorAll('[data-part="indicator"]').length;
  }

  counts.value = next;

  const childIndicator = root.querySelector<HTMLElement>('.ind-demo__own-dot');

  childMarkup.value = childIndicator ? childIndicator.outerHTML : '（未挂载）';
}

onMounted(measure);

watch(value, async () => {
  await nextTick();

  measure();
});
</script>

<template>
  <div ref="wrapperEl">
    <p class="ind-demo__hint">
      切换选项，观察每行末尾「该项 DOM 中的 Indicator 节点数」：默认挂载的行在未选中时是 0，
      <code>forceMount</code> 那行始终是 1。
    </p>

    <RadioGroupRoot v-model="value" aria-labelledby="ind-demo-label" class="y-radio-group">
      <p id="ind-demo-label" class="ind-demo__title">Indicator 用法对照</p>

      <RadioGroupItem value="default" class="y-radio">
        <RadioGroupIndicator class="y-radio__indicator">
          <span class="y-radio__dot" />
        </RadioGroupIndicator>

        <span class="y-radio__label"> 默认挂载 · 节点数 {{ counts.default }} </span>
      </RadioGroupItem>

      <RadioGroupItem value="force" class="y-radio">
        <RadioGroupIndicator force-mount class="y-radio__indicator">
          <span class="y-radio__dot" />
        </RadioGroupIndicator>

        <span class="y-radio__label"> <code>forceMount</code> · 节点数 {{ counts.force }} </span>
      </RadioGroupItem>

      <RadioGroupItem value="svg" class="y-radio">
        <RadioGroupIndicator
          as="svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          class="y-radio__indicator"
          style="color: var(--y-color-primary)"
        >
          <circle cx="8" cy="8" r="4" fill="currentColor" />
        </RadioGroupIndicator>

        <span class="y-radio__label"> <code>as="svg"</code> · 节点数 {{ counts.svg }} </span>
      </RadioGroupItem>

      <RadioGroupItem value="child" class="y-radio">
        <RadioGroupIndicator as-child class="y-radio__indicator">
          <span class="ind-demo__own-dot" />
        </RadioGroupIndicator>

        <span class="y-radio__label"> <code>asChild</code> · 节点数 {{ counts.child }} </span>
      </RadioGroupItem>
    </RadioGroupRoot>

    <p class="ind-demo__markup"><code>asChild</code> 渲染结果：{{ childMarkup }}</p>
  </div>
</template>

<style scoped>
.ind-demo__hint {
  margin: 0 0 12px;
  font-size: 0.9em;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.ind-demo__title {
  margin: 0 0 4px;
  font-size: 0.9em;
  color: var(--vp-c-text-2);
}

.ind-demo__markup {
  margin: 12px 0 0;
  font-size: 0.8em;
  color: var(--vp-c-text-3);
  word-break: break-all;
}
</style>

<style>
/* 传给 asChild 合并的元素：不写在这里就看不到效果，因为它由 Slot 转发属性后单独成节点。 */
.ind-demo__own-dot {
  display: inline-flex;
  width: 16px;
  height: 16px;
  background: var(--y-color-primary);
  border-radius: 50%;
}
</style>
