<script setup lang="ts">
import { ref } from 'vue';

import { Button } from '@agile-plus/components/button';

const loading = ref(false);

const clicks = ref(0);

const submitted = ref<Array<[string, string]>>([]);

let timer: ReturnType<typeof setTimeout> | undefined;

function simulateSubmit(): void {
  loading.value = true;

  clearTimeout(timer);
  timer = setTimeout(() => {
    loading.value = false;
  }, 1500);
}

function onSubmit(event: Event): void {
  submitted.value = Array.from(new FormData(event.target as HTMLFormElement).entries());
}
</script>

<template>
  <div class="button-demo">
    <section class="button-demo__row">
      <Button variant="primary">主要按钮</Button>
      <Button>默认按钮</Button>
      <Button variant="dashed">虚线按钮</Button>
      <Button variant="text">文本按钮</Button>
      <Button variant="link">链接按钮</Button>
    </section>

    <section class="button-demo__row">
      <Button variant="primary" size="small">small</Button>
      <Button variant="primary" size="middle">middle</Button>
      <Button variant="primary" size="large">large</Button>
      <Button disabled>禁用</Button>
    </section>

    <section class="button-demo__row">
      <Button variant="primary" :loading="loading" @click="simulateSubmit">
        {{ loading ? '提交中…' : '模拟提交' }}
      </Button>
      <Button @click="clicks += 1">点我计数</Button>
      <span class="button-demo__state">点击次数：{{ clicks }}</span>
    </section>

    <form class="button-demo__form" @submit.prevent="onSubmit">
      <input type="hidden" name="token" value="abc123" />
      <div class="button-demo__row">
        <Button type="submit" variant="primary">submit 提交</Button>
        <Button type="reset">reset 重置</Button>
        <span class="button-demo__state">
          提交结果：<code>{{ JSON.stringify(submitted) }}</code>
        </span>
      </div>
    </form>

    <section class="button-demo__row">
      <Button as-child variant="link">
        <a href="https://vitepress.dev/" target="_blank" rel="noreferrer">asChild：渲染成链接</a>
      </Button>
    </section>

    <p class="button-demo__hint">
      loading 期间按钮合并进禁用态并输出 aria-busy，spinner 用 currentcolor 跟随变体文字色；
      type 缺省是 button，不会误提交表单。asChild 时不注入 spinner（保持唯一子节点），
      loading 状态仍由 data-loading / aria-busy 表达。
    </p>
  </div>
</template>

<style scoped>
.button-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.button-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.button-demo__state {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.button-demo__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
}

.button-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

/* VitePress 的 .vp-doc a 比 .y-button--link  specificity 高，会把链接变体染成
   文档站链接色并加下划线；这里用组件库自己的变量恢复变体外观。 */
.button-demo a {
  color: var(--y-button-color, var(--y-color-primary));
  text-decoration: none;
}

.button-demo a:hover {
  color: var(--y-button-hover-color, var(--y-color-primary-hover));
}
</style>