<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';

import { Progress } from '@agile-plus/components/progress';

const step = ref(30);

const running = ref(false);

/** 步骤制：上限不是 100，播报文本也换成自定义文案。 */
const current = ref(2);

const total = 8;

const indeterminate = ref(true);

let timer = 0;

/**
 * 用定时器模拟外部数据推进度。
 *
 * 进度值唯一来源是外部数据，组件自己不产生变化；这里的 interval 只是把「外部」具象化，
 * 卸载时必须清掉，否则定时器会跨页面继续写已经销毁的 ref。
 */
function toggleRunning(): void {
  if (running.value) {
    window.clearInterval(timer);
    running.value = false;

    return;
  }

  running.value = true;

  timer = window.setInterval(() => {
    step.value = step.value >= 100 ? 0 : step.value + 10;
  }, 200);
}

function addStep(): void {
  current.value = Math.min(current.value + 1, total);
}

onBeforeUnmount(() => {
  window.clearInterval(timer);
});
</script>

<template>
  <div class="progress-demo">
    <section class="progress-demo__block">
      <Progress :value="step" />

      <div class="progress-demo__row">
        <span class="progress-demo__state"
          >value = <code>{{ step }}</code></span
        >

        <button type="button" class="progress-demo__button" @click="toggleRunning">
          {{ running ? '停止' : '自动推进' }}
        </button>

        <button
          type="button"
          class="progress-demo__button"
          :disabled="running"
          @click="step = step >= 100 ? 0 : 100"
        >
          直接完成
        </button>
      </div>
    </section>

    <section class="progress-demo__block">
      <Progress :value="current" :max="total" :get-value-label="(v, m) => `${v} / ${m} 步`" />

      <div class="progress-demo__row">
        <span class="progress-demo__state">
          读屏播报：<code>{{ current }} / {{ total }} 步</code>
        </span>

        <button type="button" class="progress-demo__button" @click="addStep">加一步</button>

        <button type="button" class="progress-demo__button" @click="current = 0">清零</button>
      </div>
    </section>

    <section class="progress-demo__block">
      <Progress :value="indeterminate ? null : 65" />

      <div class="progress-demo__row">
        <span class="progress-demo__state">
          {{ indeterminate ? '不确定进度：没有可播报的百分比' : '已知 65%' }}
        </span>

        <button type="button" class="progress-demo__button" @click="indeterminate = !indeterminate">
          切换
        </button>
      </div>
    </section>

    <p class="progress-demo__hint">
      进度条不产生用户输入，因此没有 <code>v-model:value</code>：<code>value</code> 只读外部数据。
      <code>value</code> 为
      <code>null</code
      >（或非有限数）时是<b>不确定进度</b>，轨道用一段来回扫动的动画表示「正在进行」； 此时
      <code>aria-valuenow</code> 与 <code>aria-valuetext</code> 都不输出，这正是 ARIA
      表达「无法量化」的方式。达到上限时 <code>data-state</code> 变成 <code>complete</code>。
    </p>
  </div>
</template>

<style scoped>
.progress-demo {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.progress-demo__block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.progress-demo__state {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.progress-demo__button {
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.progress-demo__button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.progress-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
</style>
