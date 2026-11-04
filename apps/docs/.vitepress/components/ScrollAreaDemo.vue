<script setup lang="ts">
import { ref } from 'vue';

import { ScrollArea } from '@agile-plus/components/scroll-area';

// 四种出现时机并排展示，便于直接对比 hover 与 scroll 的差异。
const types = ['hover', 'scroll', 'auto', 'always'] as const;

// 1 段时内容短于视口，才能真正验证「无溢出 ⇒ 滚动条消失」。
const count = ref(12);

function toggleCount(): void {
  count.value = count.value === 12 ? 1 : 12;
}
</script>

<template>
  <div class="sa-demo">
    <div class="sa-demo__bar">
      <button type="button" class="sa-demo__btn" @click="toggleCount">
        切换内容长度（当前 {{ count }} 段）
      </button>

      <span class="sa-demo__hint">
        切成 1 段后内容不再溢出，滚动条与 thumb 应当一起消失——这验证了尺寸观察器在生效。
      </span>
    </div>

    <div class="sa-demo__grid">
      <div v-for="item in types" :key="item" class="sa-demo__cell">
        <p class="sa-demo__label">
          <code>type="{{ item }}"</code>
        </p>

        <ScrollArea :type="item" class="sa-demo__box">
          <div class="sa-demo__content">
            <p v-for="index in count" :key="index">
              {{ item }} · 第 {{ index }} 段 —— 用足够长的正文制造真实的溢出，滚动后 thumb 的位置由
              scrollTop 换算得到。
            </p>
          </div>
        </ScrollArea>
      </div>
    </div>

    <p class="sa-demo__label">横向溢出（同时拖动两个方向可看到角部方块）</p>

    <ScrollArea class="sa-demo__box sa-demo__box--wide">
      <div class="sa-demo__content sa-demo__content--wide">
        <p v-for="index in count" :key="index">
          第 {{ index }} 段宽内容，配合纵向溢出时右下角会出现 corner。
        </p>
      </div>
    </ScrollArea>
  </div>
</template>

<style scoped>
.sa-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sa-demo__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.sa-demo__btn {
  padding: 4px 12px;
  font-size: 0.85em;
  color: var(--vp-c-text-1);
  cursor: pointer;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.sa-demo__hint {
  font-size: 0.85em;
  color: var(--vp-c-text-2);
}

.sa-demo__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.sa-demo__cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sa-demo__label {
  margin: 0;
  font-size: 0.85em;
  color: var(--vp-c-text-2);
}

.sa-demo__box {
  height: 180px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.sa-demo__box--wide {
  height: 140px;
}

.sa-demo__content {
  padding: 12px;
}

.sa-demo__content p {
  margin: 0 0 10px;
  font-size: 0.85em;
  line-height: 1.6;
}

.sa-demo__content--wide {
  width: 1600px;
}
</style>
