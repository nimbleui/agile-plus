<script setup lang="ts">
import { computed, ref } from 'vue';

import { Select } from '@agile-plus/components/select';
import { VirtualList } from '@agile-plus/components/virtual-list';
import { VirtualList as VirtualListPrimitive } from '@agile-plus/ui/virtual-list';

import type { SelectOptionItem } from '@agile-plus/components/select';
import type { VirtualListHandle } from '@agile-plus/components/virtual-list';

interface Row {
  id: number;
  title: string;
  detail: string;
}

/**
 * 无样式层 expose 出来的那部分入口。
 *
 * `defineExpose` 交出的实例代理会把属性上的 ref 解包，所以这里写成值而不是 `Ref` / `ComputedRef`：
 * 按 Ref 声明会让文档站去读一个不存在的 `.value`。
 */
interface PrimitiveApi {
  startIndex: number;
  endIndex: number;
  visibleIndices: number[];
  totalSize: string;
  scrollTop: number;
  viewportSize: number;
  scrollToIndex(index: number): void;
  scrollToOffset(offset: number): void;
  invalidateMeasurements(): void;
}

const TITLES = [
  '同步订单到财务系统',
  '校验对账文件',
  '生成月度汇总报表',
  '推送异常告警',
  '清理过期会话',
  '重建搜索索引',
];

/** 三条一循环：空 / 一句 / 一段，行高因此真的参差不齐，而不是靠样式假装。 */
const DETAILS = [
  '',
  '上游接口在第 2 次重试后超时，任务已转入延迟队列，预计 5 分钟内恢复。',
  '本次执行处理了 12,480 条记录，其中 37 条因缺少成本中心被跳过；跳过明细已写入审计日志，需要在下个交易日前补齐，否则月度汇总会出现缺口，且补录后仍需重跑当天的对账任务。',
];

/** 取模并保证负下标也能落到合法位置：种子递增后不需要调用方自己防越界。 */
function pickAt(list: readonly string[], index: number): string {
  const length = list.length;

  return length === 0 ? '' : list[((index % length) + length) % length] ?? '';
}

function makeRows(count: number, startId: number, varied: boolean, seed: number): Row[] {
  return Array.from({ length: count }, (_, offset) => {
    const id = startId + offset;

    return {
      id,
      title: pickAt(TITLES, id + seed),
      detail: varied ? pickAt(DETAILS, id + seed) : '',
    };
  });
}

const countChoices: SelectOptionItem[] = [
  { value: '1000', label: '1,000 条' },
  { value: '20000', label: '20,000 条' },
  { value: '200000', label: '200,000 条' },
];

const variedChoices: SelectOptionItem[] = [
  { value: 'true', label: '长短交替（动态高度）' },
  { value: 'false', label: '全部单行（等高）' },
];

/** 实时演练场：数据、几何参数与动作全部即时作用于同一个列表实例。 */
const pgCountKey = ref('20000');
const pgVariedKey = ref('true');
const pgEstimate = ref(40);
const pgOverscan = ref(3);
const pgHeight = ref(320);
const pgJump = ref(10000);
const pgSeed = ref(0);
const pgScrollTop = ref(0);

const listHandle = ref<VirtualListHandle | null>(null);

const baseRows = computed(() =>
  makeRows(
    Number(pgCountKey.value),
    0,
    pgVariedKey.value === 'true',
    pgSeed.value
  )
);

/** 追加走尾部：已测高度按下标保留，上方内容不会因此跳动。 */
const extraRows = ref<Row[]>([]);

const rows = computed(() =>
  extraRows.value.length === 0 ? baseRows.value : [...baseRows.value, ...extraRows.value]
);

function pgAppend(): void {
  const startId = baseRows.value.length + extraRows.value.length;

  extraRows.value = [...extraRows.value, ...makeRows(1000, startId, pgVariedKey.value === 'true', pgSeed.value)];
}

/** 整体替换：下标语义下的旧高度结论已经属于另一批数据，所以这里刻意不自动重量、也不归零滚动位置。 */
function pgReplace(): void {
  pgSeed.value += 1;
  extraRows.value = [];
}

function pgInvalidate(): void {
  listHandle.value?.invalidateMeasurements();
}

function pgScrollToIndex(): void {
  listHandle.value?.scrollToIndex(pgJump.value);
}

function pgReset(): void {
  pgCountKey.value = '20000';
  pgVariedKey.value = 'true';
  pgEstimate.value = 40;
  pgOverscan.value = 3;
  pgHeight.value = 320;
  pgJump.value = 10000;
  pgSeed.value = 0;
  extraRows.value = [];

  // 回顶要真的写容器：滚动位置是从 scroll 事件读来的，自己清零会显示成一个不存在的 0。
  listHandle.value?.scrollToOffset(0);
}

/** 读滚动位置而不是读组件状态：成品层只转发动作，区间与滚动值留给无样式层。 */
function onScroll(event: Event): void {
  const target = event.target as HTMLElement | null;

  pgScrollTop.value = target?.scrollTop ?? 0;
}

const pairUniform = makeRows(3000, 0, false, 0);
const pairVaried = makeRows(3000, 0, true, 0);

const rawRows = makeRows(200000, 0, true, 0);
const rawApi = ref<PrimitiveApi | null>(null);
</script>

<template>
  <div class="virtual-list-demo">
    <section class="virtual-list-demo__block">
      <h4>实时演练场</h4>

      <p class="virtual-list-demo__hint">
        条数、内容形态、预估行高、预渲染行数与容器高度即时生效。把「预渲染行数」拉到 0
        再快速滚动，能直接看到视口边缘的空白；把「预估行高」改成与真实行高差很多的值，
        滚动条长度会在滚动过程中伸缩——那就是未测量区段还在按估算记账。
      </p>

      <div class="virtual-list-demo__panel">
        <div class="virtual-list-demo__ctrl">
          <span>数据条数</span>
          <Select v-model="pgCountKey" :options="countChoices" size="small" />
        </div>

        <div class="virtual-list-demo__ctrl">
          <span>内容形态</span>
          <Select v-model="pgVariedKey" :options="variedChoices" size="small" />
        </div>

        <label class="virtual-list-demo__ctrl">
          <span>预估行高 {{ pgEstimate }}px</span>
          <input v-model.number="pgEstimate" type="range" min="20" max="120" step="5" />
        </label>

        <label class="virtual-list-demo__ctrl">
          <span>预渲染行数 {{ pgOverscan }}</span>
          <input v-model.number="pgOverscan" type="range" min="0" max="8" step="1" />
        </label>

        <label class="virtual-list-demo__ctrl">
          <span>容器高度 {{ pgHeight }}px</span>
          <input v-model.number="pgHeight" type="range" min="160" max="480" step="20" />
        </label>

        <label class="virtual-list-demo__ctrl">
          <span>滚动到下标</span>
          <input v-model.number="pgJump" type="number" min="0" step="1" />
        </label>

        <div class="virtual-list-demo__ctrl-actions">
          <button type="button" class="virtual-list-demo__button" @click="pgScrollToIndex">
            跳转
          </button>
          <button type="button" class="virtual-list-demo__button" @click="pgAppend">
            追加 1,000 条
          </button>
          <button type="button" class="virtual-list-demo__button" @click="pgReplace">
            替换全部
          </button>
          <button type="button" class="virtual-list-demo__button" @click="pgInvalidate">
            重量高度
          </button>
          <button type="button" class="virtual-list-demo__button" @click="pgReset">重置</button>
        </div>
      </div>

      <div class="virtual-list-demo__box" @scroll.capture="onScroll">
        <VirtualList
          ref="listHandle"
          :items="rows"
          :estimate-size="pgEstimate"
          :overscan="pgOverscan"
          :height="pgHeight"
        >
          <template #default="{ item, index }">
            <div class="virtual-list-demo__row">
              <span class="virtual-list-demo__title">{{ index }} · {{ item.title }}</span>
              <p v-if="item.detail" class="virtual-list-demo__detail">{{ item.detail }}</p>
            </div>
          </template>
        </VirtualList>
      </div>

      <p class="virtual-list-demo__value">
        当前 <code>{{ rows.length.toLocaleString('en-US') }}</code> 条 · 滚动位置
        <code>{{ pgScrollTop }}px</code>；「替换全部」后按高度已经错位，点「重量高度」才恢复精确。
      </p>
    </section>

    <section class="virtual-list-demo__block">
      <h4>等高与动态高度对照</h4>

      <p class="virtual-list-demo__hint">
        两侧数据条数、容器高度、预估行高完全一致，只有行内容不同。右侧长行被量出真实高度后
        只替换掉该下标的估算值，区间随之收缩——每帧渲染的行数由实测高度决定，不是写死的。
      </p>

      <div class="virtual-list-demo__pair">
        <div class="virtual-list-demo__mode">
          <span class="virtual-list-demo__tag">全部单行</span>
          <VirtualList :items="pairUniform" :height="240" :estimate-size="40">
            <template #default="{ item, index }">
              <span>{{ index }} · {{ item.title }}</span>
            </template>
          </VirtualList>
        </div>

        <div class="virtual-list-demo__mode">
          <span class="virtual-list-demo__tag">长短交替</span>
          <VirtualList :items="pairVaried" :height="240" :estimate-size="40">
            <template #default="{ item, index }">
              <span>{{ index }} · {{ item.title }}</span>
              <p v-if="item.detail" class="virtual-list-demo__detail">{{ item.detail }}</p>
            </template>
          </VirtualList>
        </div>
      </div>
    </section>

    <section class="virtual-list-demo__block">
      <h4>无样式层：区间状态直接可读</h4>

      <p class="virtual-list-demo__hint">
        同一套算法在没有 CSS 时也成立：下面这格用 `ui/virtual-list`，行内样式由本页自带，
        渲染区间、总高与可视高度直接从组件 expose 读——成品层刻意只转发三个动作，
        要看区间就来这一层（或无头层的 `useVirtualList`）。
      </p>

      <VirtualListPrimitive
        ref="rawApi"
        class="virtual-list-demo__raw"
        :items="rawRows"
        :height="220"
        :estimate-size="40"
        :overscan="3"
      >
        <template #default="{ item, index }">
          <span>{{ index }} · {{ item.title }}</span>
        </template>
      </VirtualListPrimitive>

      <p class="virtual-list-demo__value">
        区间 <code>[{{ rawApi?.startIndex }}, {{ rawApi?.endIndex }}]</code> · 在屏
        <code>{{ rawApi?.visibleIndices.length }}</code> 行 · 总高
        <code>{{ rawApi?.totalSize }}</code> · 可视高 <code>{{ rawApi?.viewportSize }}px</code> ·
        scrollTop <code>{{ rawApi?.scrollTop }}px</code>
      </p>

      <div class="virtual-list-demo__ctrl-actions">
        <button type="button" class="virtual-list-demo__button" @click="rawApi?.scrollToIndex(100000)">
          跳到第 100,000 项
        </button>
        <button type="button" class="virtual-list-demo__button" @click="rawApi?.scrollToOffset(0)">
          回到顶部
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.virtual-list-demo {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.virtual-list-demo__block h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.virtual-list-demo__hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.virtual-list-demo__panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px 16px;
  padding: 16px;
  margin-bottom: 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}

.virtual-list-demo__ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.virtual-list-demo__ctrl :deep(.y-select) {
  width: 100%;
}

.virtual-list-demo__ctrl input[type='range'],
.virtual-list-demo__ctrl input[type='number'] {
  width: 100%;
  accent-color: var(--vp-c-brand-1);
}

.virtual-list-demo__ctrl input[type='number'] {
  padding: 3px 8px;
  font-size: 13px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.virtual-list-demo__ctrl-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: end;
  grid-column: 1 / -1;
}

.virtual-list-demo__button {
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.virtual-list-demo__button:hover {
  border-color: var(--vp-c-brand-1);
}

.virtual-list-demo__box {
  border: 1px dashed var(--vp-c-divider);
  border-radius: 10px;
}

.virtual-list-demo__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.virtual-list-demo__title {
  font-size: 13px;
}

.virtual-list-demo__detail {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-3);
}

.virtual-list-demo__pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}

.virtual-list-demo__mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.virtual-list-demo__tag {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.virtual-list-demo__value {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

/* 无样式层不带任何外观，这一格用页面样式替它补上，正好演示「样式完全可替换」。 */
.virtual-list-demo__raw {
  font-size: 13px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.virtual-list-demo__raw :deep([data-part='row']) {
  padding: 6px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
}
</style>
