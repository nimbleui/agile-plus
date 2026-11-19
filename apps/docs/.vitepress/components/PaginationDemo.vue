<script setup lang="ts">
import { ref } from 'vue';

import { Pagination } from '@agile-plus/components/pagination';

const page = ref(1);

const widePage = ref(3);

const sizePage = ref(1);

const jumperPage = ref(1);

const disabled = ref(false);

const size = ref<'small' | 'middle' | 'large'>('middle');
</script>

<template>
  <div class="pagination-demo">
    <section class="pagination-demo__block">
      <Pagination v-model="page" :total="100" :page-size="10" />

      <div class="pagination-demo__row">
        <span class="pagination-demo__state">
          当前页：<code>{{ page }}</code> / 共 10 页
        </span>
      </div>
    </section>

    <section class="pagination-demo__block">
      <Pagination v-model="widePage" :page-count="7" :sibling-count="2" :boundary-count="2" />

      <div class="pagination-demo__row">
        <span class="pagination-demo__state">
          直接指定 <code>pageCount=7</code>，窗口加宽到每侧 2 个兄弟页、首尾各固定 2 页
        </span>
      </div>
    </section>

    <section class="pagination-demo__block">
      <div class="pagination-demo__row">
        <Pagination v-model="sizePage" :total="40" :size="size" :disabled="disabled" />
      </div>

      <div class="pagination-demo__row">
        <button
          v-for="option in ['small', 'middle', 'large'] as const"
          :key="option"
          type="button"
          class="pagination-demo__button"
          :class="{ 'pagination-demo__button--active': size === option }"
          @click="size = option"
        >
          {{ option }}
        </button>

        <button type="button" class="pagination-demo__button" @click="disabled = !disabled">
          {{ disabled ? '解除禁用' : '禁用' }}
        </button>
      </div>
    </section>

    <section class="pagination-demo__block">
      <Pagination :default-value="4" :total="200" />

      <div class="pagination-demo__row">
        <span class="pagination-demo__state">
          非受控：<code>default-value=4</code> 起步，页码由组件自己持有
        </span>
      </div>
    </section>

    <section class="pagination-demo__block">
      <Pagination v-model="jumperPage" :total="100" show-jumper />

      <div class="pagination-demo__row">
        <span class="pagination-demo__state">
          输入页码后回车或失焦跳转，当前页：<code>{{ jumperPage }}</code
          >；输 <code>99</code>
          会夹到末页
        </span>
      </div>
    </section>

    <p class="pagination-demo__hint">
      页码窗口由 primitives 层算出：缺口只有 1 页时直接补页码而不是省略号，总页数少时全部展开。
      当前页通过 <code>aria-current="page"</code> 播报；整条禁用时程序写入同样被吞掉。
      页码项由消费者 <code>v-for</code> 分发的复合用法见下文「无样式层用法」。
    </p>
  </div>
</template>

<style scoped>
.pagination-demo {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.pagination-demo__block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pagination-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.pagination-demo__state {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.pagination-demo__button {
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.pagination-demo__button--active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.pagination-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
</style>
