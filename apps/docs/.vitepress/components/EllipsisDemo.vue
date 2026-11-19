<script setup lang="ts">
import { computed, ref } from 'vue';

import { Ellipsis } from '@agile-plus/components/ellipsis';
import { Select } from '@agile-plus/components/select';

import type { EllipsisMode, EllipsisSize } from '@agile-plus/components/ellipsis';
import type { SelectOptionItem } from '@agile-plus/components/select';

const TEXTS: Record<string, string> = {
  cjk: '这是一段足够长的中文文本，用来演示单行与多行省略：当容器宽度不足以放下全部文字时，尾部会出现省略号，悬停或聚焦即可读到全文。',
  file: 'quarterly-financial-report-2026-Q3-final-reviewed.xlsx',
  hash: 'sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  short: '短文本不会溢出',
};

const modeChoices: SelectOptionItem[] = [
  { value: 'single', label: '单行 single' },
  { value: 'multi', label: '多行 multi' },
  { value: 'middle', label: '中间 middle' },
];

const sizeChoices: SelectOptionItem[] = [
  { value: 'small', label: 'small' },
  { value: 'middle', label: 'middle' },
  { value: 'large', label: 'large' },
];

const textChoices: SelectOptionItem[] = [
  { value: 'cjk', label: '中文段落' },
  { value: 'file', label: '文件名' },
  { value: 'hash', label: '哈希串' },
  { value: 'short', label: '短文本' },
];

/** 实时演练场：所有控件即时作用于预览省略盒。 */
const pgMode = ref<EllipsisMode>('single');
const pgSize = ref<EllipsisSize>('middle');
const pgTextKey = ref('cjk');
const pgLines = ref(2);
const pgTail = ref(4);
const pgWidth = ref(280);
const pgExpandable = ref(true);
const pgTooltip = ref(true);
const pgExpanded = ref(false);

const pgText = computed(() => TEXTS[pgTextKey.value] ?? TEXTS.cjk);

function pgReset(): void {
  pgMode.value = 'single';
  pgSize.value = 'middle';
  pgTextKey.value = 'cjk';
  pgLines.value = 2;
  pgTail.value = 4;
  pgWidth.value = 280;
  pgExpandable.value = true;
  pgTooltip.value = true;
  pgExpanded.value = false;
}

function pgRandomText(): void {
  const keys = Object.keys(TEXTS);
  const next = keys[Math.floor(Math.random() * keys.length)];

  pgTextKey.value = next === pgTextKey.value ? keys[(keys.indexOf(next) + 1) % keys.length] : next;
}

const tableRows = [
  { name: 'quarterly-financial-report-2026-Q3-final-reviewed.xlsx', owner: '财务组' },
  { name: 'sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', owner: '安全组' },
  { name: '短文件名.txt', owner: '测试组' },
];
</script>

<template>
  <div class="ellipsis-demo">
    <section class="ellipsis-demo__block">
      <h4>实时演练场</h4>

      <p class="ellipsis-demo__hint">
        每一格都即时作用于预览省略盒：改模式、行数、尾部保留、容器宽度、尺寸与文本，
        或切换可展开 / Tooltip。拖动宽度滑块能直接看到溢出判定翻转。
      </p>

      <div class="ellipsis-demo__panel">
        <div class="ellipsis-demo__ctrl">
          <span>模式</span>
          <Select v-model="pgMode" :options="modeChoices" size="small" />
        </div>

        <div class="ellipsis-demo__ctrl">
          <span>尺寸</span>
          <Select v-model="pgSize" :options="sizeChoices" size="small" />
        </div>

        <div class="ellipsis-demo__ctrl">
          <span>文本</span>
          <Select v-model="pgTextKey" :options="textChoices" size="small" />
        </div>

        <label class="ellipsis-demo__ctrl">
          <span>多行行数 {{ pgLines }}</span>
          <input v-model.number="pgLines" type="range" min="1" max="6" step="1" />
        </label>

        <label class="ellipsis-demo__ctrl">
          <span>尾部保留 {{ pgTail }}</span>
          <input v-model.number="pgTail" type="range" min="0" max="12" step="1" />
        </label>

        <label class="ellipsis-demo__ctrl">
          <span>容器宽度 {{ pgWidth }}px</span>
          <input v-model.number="pgWidth" type="range" min="80" max="560" step="4" />
        </label>

        <label class="ellipsis-demo__check">
          <input v-model="pgExpandable" type="checkbox" /> 可展开
        </label>
        <label class="ellipsis-demo__check">
          <input v-model="pgTooltip" type="checkbox" /> Tooltip 全文
        </label>

        <div class="ellipsis-demo__ctrl-actions">
          <button type="button" class="ellipsis-demo__button" @click="pgRandomText">换一段文本</button>
          <button type="button" class="ellipsis-demo__button" @click="pgReset">重置</button>
        </div>
      </div>

      <div class="ellipsis-demo__preview">
        <div :style="{ width: `${pgWidth}px` }">
          <Ellipsis
            v-model:expanded="pgExpanded"
            :mode="pgMode"
            :lines="pgLines"
            :tail-chars="pgTail"
            :expandable="pgExpandable"
            :tooltip="pgTooltip"
            :size="pgSize"
          >
            {{ pgText }}
          </Ellipsis>
        </div>
      </div>

      <p class="ellipsis-demo__value">
        展开态：<code>{{ pgExpanded }}</code>
      </p>
    </section>

    <section class="ellipsis-demo__block">
      <h4>三种模式</h4>

      <div class="ellipsis-demo__modes">
        <div class="ellipsis-demo__mode">
          <span class="ellipsis-demo__tag">single</span>
          <div style="width: 220px">
            <Ellipsis :expandable="false">{{ TEXTS.cjk }}</Ellipsis>
          </div>
        </div>

        <div class="ellipsis-demo__mode">
          <span class="ellipsis-demo__tag">multi · 2 行</span>
          <div style="width: 220px">
            <Ellipsis mode="multi" :lines="2">{{ TEXTS.cjk }}</Ellipsis>
          </div>
        </div>

        <div class="ellipsis-demo__mode">
          <span class="ellipsis-demo__tag">middle · 保留 4</span>
          <div style="width: 220px">
            <Ellipsis mode="middle" :tail-chars="4">{{ TEXTS.file }}</Ellipsis>
          </div>
        </div>
      </div>
    </section>

    <section class="ellipsis-demo__block">
      <h4>表格单元格：中间省略保住扩展名与哈希尾部</h4>

      <table class="ellipsis-demo__table">
        <thead>
          <tr>
            <th>文件名 / 哈希</th>
            <th>归属</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableRows" :key="row.name">
            <td>
              <Ellipsis mode="middle" :tail-chars="8" :tooltip="true">{{ row.name }}</Ellipsis>
            </td>
            <td>{{ row.owner }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ellipsis-demo__block">
      <h4>展开 / 收起与不可断行长串</h4>

      <div class="ellipsis-demo__modes">
        <div class="ellipsis-demo__mode">
          <span class="ellipsis-demo__tag">expandable</span>
          <div style="width: 240px">
            <Ellipsis mode="multi" :lines="2" expandable>{{ TEXTS.cjk }}</Ellipsis>
          </div>
        </div>

        <div class="ellipsis-demo__mode">
          <span class="ellipsis-demo__tag">不可断行哈希</span>
          <div style="width: 240px">
            <Ellipsis mode="single">{{ TEXTS.hash }}</Ellipsis>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ellipsis-demo {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.ellipsis-demo__block h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.ellipsis-demo__hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.ellipsis-demo__panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px 16px;
  padding: 16px;
  margin-bottom: 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}

.ellipsis-demo__ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.ellipsis-demo__ctrl :deep(.y-select) {
  width: 100%;
}

.ellipsis-demo__ctrl input[type='range'] {
  width: 100%;
  accent-color: var(--vp-c-brand-1);
}

.ellipsis-demo__check {
  display: flex;
  gap: 6px;
  align-items: center;
  align-self: end;
  padding-bottom: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.ellipsis-demo__check input {
  accent-color: var(--vp-c-brand-1);
}

.ellipsis-demo__ctrl-actions {
  display: flex;
  gap: 8px;
  align-items: end;
  grid-column: 1 / -1;
}

.ellipsis-demo__button {
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.ellipsis-demo__button:hover {
  border-color: var(--vp-c-brand-1);
}

.ellipsis-demo__preview {
  padding: 20px 16px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 10px;
}

.ellipsis-demo__value {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.ellipsis-demo__modes {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.ellipsis-demo__mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ellipsis-demo__tag {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.ellipsis-demo__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.ellipsis-demo__table th,
.ellipsis-demo__table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}

.ellipsis-demo__table td:first-child {
  max-width: 320px;
}
</style>
