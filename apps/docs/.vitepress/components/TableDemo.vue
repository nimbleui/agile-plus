<script setup lang="ts">
import { computed, ref } from 'vue';

import { Button } from '@agile-plus/components/button';
import { Pagination } from '@agile-plus/components/pagination';
import { Select } from '@agile-plus/components/select';
import { Switch } from '@agile-plus/components/switch';
import { Table } from '@agile-plus/components/table';
import {
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from '@agile-plus/ui/table';

import type { TableSize } from '@agile-plus/components/table';
import type { TableColumn, TableRowData } from '@agile-plus/ui/table';

/** 行类型用 type 别名而非 interface：才能赋给 Record<string, unknown> 的行契约。 */
type Instance = {
  key: string;
  name: string;
  region: string;
  status: 'running' | 'stopped' | 'deploying';
  cpu: number;
  version: string;
  updatedAt: string;
  desc: string;
};

const seed: Instance[] = [
  { key: 'i-01', name: 'gateway-prod-01', region: '杭州', status: 'running', cpu: 62, version: 'v2.8.1', updatedAt: '2026-11-18 09:24', desc: '入口网关，承载全站南北向流量，双活部署。' },
  { key: 'i-02', name: 'order-svc-03', region: '上海', status: 'running', cpu: 87, version: 'v3.1.0', updatedAt: '2026-11-18 08:51', desc: '订单核心服务，大促期间自动扩容至 12 副本。' },
  { key: 'i-03', name: 'payment-svc-01', region: '杭州', status: 'deploying', cpu: 34, version: 'v1.9.4', updatedAt: '2026-11-18 09:30', desc: '支付清结算，正在灰度发布 v1.9.4。' },
  { key: 'i-04', name: 'search-index-02', region: '北京', status: 'running', cpu: 45, version: 'v4.0.2', updatedAt: '2026-11-17 22:10', desc: '搜索索引节点，冷数据已下沉对象存储。' },
  { key: 'i-05', name: 'user-svc-01', region: '上海', status: 'stopped', cpu: 0, version: 'v2.2.0', updatedAt: '2026-11-16 14:02', desc: '用户中心，已停机等待迁移到新集群。' },
  { key: 'i-06', name: 'cache-redis-04', region: '杭州', status: 'running', cpu: 28, version: 'v7.2.0', updatedAt: '2026-11-18 07:15', desc: 'Redis 缓存集群从节点，命中率 98.6%。' },
  { key: 'i-07', name: 'mq-broker-02', region: '北京', status: 'running', cpu: 71, version: 'v5.1.3', updatedAt: '2026-11-18 06:48', desc: '消息队列 broker，积压告警阈值 10w。' },
  { key: 'i-08', name: 'report-job-01', region: '深圳', status: 'running', cpu: 93, version: 'v1.4.7', updatedAt: '2026-11-18 09:05', desc: '离线报表任务，凌晨批量跑批占用较高。' },
  { key: 'i-09', name: 'cdn-edge-07', region: '深圳', status: 'running', cpu: 18, version: 'v3.3.1', updatedAt: '2026-11-17 19:33', desc: '边缘加速节点，回源率 4.2%。' },
  { key: 'i-10', name: 'auth-svc-02', region: '上海', status: 'deploying', cpu: 52, version: 'v2.0.0', updatedAt: '2026-11-18 09:28', desc: '统一认证，OAuth2 改造灰度中。' },
  { key: 'i-11', name: 'log-collector-03', region: '北京', status: 'running', cpu: 39, version: 'v1.7.2', updatedAt: '2026-11-18 05:20', desc: '日志采集，日均摄入 2.4TB。' },
  { key: 'i-12', name: 'ml-inference-01', region: '杭州', status: 'stopped', cpu: 0, version: 'v0.9.5', updatedAt: '2026-11-15 11:47', desc: '推理服务，GPU 资源池回收后暂停。' },
];

const instances = ref<Instance[]>(seed.map((item) => ({ ...item })));

const columns: TableColumn[] = [
  { key: 'name', title: '实例', width: 170, fixed: 'left', sortable: true },
  { key: 'region', title: '区域', width: 100, sortable: true },
  { key: 'status', title: '状态', width: 120 },
  { key: 'cpu', title: 'CPU 占用', width: 170, sortable: true },
  { key: 'version', title: '版本', width: 100 },
  { key: 'updatedAt', title: '更新时间', width: 170 },
  { key: 'action', title: '操作', width: 90, fixed: 'right' },
];

const statusMeta: Record<Instance['status'], { label: string; tone: string }> = {
  running: { label: '运行中', tone: 'success' },
  deploying: { label: '发布中', tone: 'warning' },
  stopped: { label: '已停止', tone: 'neutral' },
};

/** 实时演练场：所有控件即时作用于下方预览表格。 */
const size = ref<TableSize>('middle');
const heightChoice = ref('360');
const stripe = ref(true);
const border = ref(false);
const selection = ref(true);
const expandable = ref(true);
const loading = ref(false);
const resizable = ref(false);
const selectedKeys = ref<string[]>([]);
const lastClicked = ref('');
const mainTable = ref<{ resetColumnWidths: () => void } | null>(null);

const sizeChoices = [
  { value: 'small', label: 'small · 紧凑' },
  { value: 'middle', label: 'middle · 默认' },
  { value: 'large', label: 'large · 宽松' },
];

const heightChoices = [
  { value: 'none', label: '不限高度' },
  { value: '240', label: '240px' },
  { value: '360', label: '360px' },
];

const maxHeight = computed(() => (heightChoice.value === 'none' ? undefined : Number(heightChoice.value)));

const selectedCount = computed(() => selectedKeys.value.length);

function cpuTone(cpu: number): string {
  if (cpu >= 80) return 'danger';
  if (cpu >= 50) return 'warning';

  return 'success';
}

function restart(row: TableRowData): void {
  const target = instances.value.find((item) => item.key === row.key);

  if (!target) return;

  target.status = 'running';
  target.cpu = 8 + Math.floor(Math.random() * 20);
  target.updatedAt = '2026-11-18 09:40';
}

function bulkRestart(): void {
  for (const key of selectedKeys.value) {
    const target = instances.value.find((item) => item.key === key);

    if (target) restart(target);
  }

  selectedKeys.value = [];
}

function randomize(): void {
  const statuses: Instance['status'][] = ['running', 'running', 'deploying', 'stopped'];

  instances.value = instances.value.map((item) => ({
    ...item,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    cpu: item.status === 'stopped' ? 0 : Math.floor(Math.random() * 100),
  }));
}

function resetPlayground(): void {
  size.value = 'middle';
  heightChoice.value = '360';
  stripe.value = true;
  border.value = false;
  selection.value = true;
  expandable.value = true;
  loading.value = false;
  selectedKeys.value = [];
  instances.value = seed.map((item) => ({ ...item }));
}

/** 分页组合示例：客户端切片，Table 与 Pagination 各自独立、通过 page 协作。 */
const logs = ref<TableRowData[]>(
  Array.from({ length: 23 }, (_, index) => ({
    key: `log-${index + 1}`,
    time: `09:${String(40 - index).padStart(2, '0')}`,
    level: index % 5 === 0 ? 'ERROR' : index % 3 === 0 ? 'WARN' : 'INFO',
    message: `事件 #${index + 1} · ${['请求受理', '缓存命中', '重试成功', '写入完成', '心跳上报'][index % 5]}`,
  }))
);

const logColumns: TableColumn[] = [
  { key: 'time', title: '时间', width: 90, sortable: true },
  { key: 'level', title: '级别', width: 90 },
  { key: 'message', title: '消息' },
];

const page = ref(1);
const pageSize = 8;
const pagedLogs = computed(() => logs.value.slice((page.value - 1) * pageSize, page.value * pageSize));

/** 复合（无样式层）示例的数据：消费者自己 v-for，部件自由组合。 */
const crew: TableRowData[] = [
  { key: 'c1', name: '林晚', role: '前端架构', commits: 128 },
  { key: 'c2', name: '周野', role: '内核工程', commits: 214 },
  { key: 'c3', name: '苏叶', role: '设计系统', commits: 96 },
];

const crewColumns: TableColumn[] = [
  { key: 'name', title: '成员', sortable: true },
  { key: 'role', title: '职责' },
  { key: 'commits', title: '提交数', align: 'right', sortable: true },
];

/** 合并单元格示例：按区域纵向合并，同区域连续行只画第一格、其余吞并。 */
const mergeData: TableRowData[] = [
  { key: 'm1', region: '杭州', order: 'SO-20261118-001', amount: 1280 },
  { key: 'm2', region: '杭州', order: 'SO-20261118-002', amount: 640 },
  { key: 'm3', region: '杭州', order: 'SO-20261118-003', amount: 2310 },
  { key: 'm4', region: '上海', order: 'SO-20261118-004', amount: 980 },
  { key: 'm5', region: '上海', order: 'SO-20261118-005', amount: 1520 },
  { key: 'm6', region: '北京', order: 'SO-20261118-006', amount: 760 },
  { key: 'm7', region: '北京', order: 'SO-20261118-007', amount: 1890 },
];

const mergeColumns: TableColumn[] = [
  { key: 'region', title: '区域', width: 120 },
  { key: 'order', title: '订单号' },
  { key: 'amount', title: '金额', align: 'right', width: 120 },
];

function mergeSpan({ row, rowIndex, columnIndex }: { row: TableRowData; rowIndex: number; columnIndex: number }) {
  if (columnIndex !== 0) return undefined;

  const region = row.region;

  if (rowIndex > 0 && mergeData[rowIndex - 1].region === region) return { rowspan: 0, colspan: 1 };

  let rowspan = 1;

  for (let i = rowIndex + 1; i < mergeData.length && mergeData[i].region === region; i += 1) rowspan += 1;

  return { rowspan, colspan: 1 };
}
</script>

<template>
  <div class="table-demo">
    <section class="table-demo__block">
      <div class="table-demo__panel">
        <div class="table-demo__field">
          <span class="table-demo__label">尺寸</span>
          <Select v-model="size" :options="sizeChoices" size="small" />
        </div>

        <div class="table-demo__field">
          <span class="table-demo__label">表体高度</span>
          <Select v-model="heightChoice" :options="heightChoices" size="small" />
        </div>

        <label class="table-demo__toggle">
          <Switch v-model:checked="stripe" /> 斑马纹
        </label>
        <label class="table-demo__toggle">
          <Switch v-model:checked="border" /> 全边框
        </label>
        <label class="table-demo__toggle">
          <Switch v-model:checked="selection" /> 选择列
        </label>
        <label class="table-demo__toggle">
          <Switch v-model:checked="expandable" /> 展开列
        </label>
        <label class="table-demo__toggle">
          <Switch v-model:checked="loading" /> 加载中
        </label>
        <label class="table-demo__toggle">
          <Switch v-model:checked="resizable" /> 列宽拖拽
        </label>

        <div class="table-demo__actions">
          <Button size="small" @click="mainTable?.resetColumnWidths()">重置列宽</Button>
          <Button size="small" @click="randomize">随机刷新</Button>
          <Button size="small" variant="primary" @click="resetPlayground">重置</Button>
        </div>
      </div>

      <div v-if="selection && selectedCount > 0" class="table-demo__bulk">
        <span>已选 {{ selectedCount }} 项</span>
        <Button size="small" variant="primary" @click="bulkRestart">批量重启</Button>
        <Button size="small" variant="text" @click="selectedKeys = []">清除选择</Button>
      </div>

      <Table
        ref="mainTable"
        v-model:selected-keys="selectedKeys"
        :data="instances"
        :columns="columns"
        :size="size"
        :stripe="stripe"
        :border="border"
        :selection="selection"
        :expandable="expandable"
        :loading="loading"
        :resizable="resizable"
        :max-height="maxHeight"
        :is-row-selectable="(row) => row.status !== 'stopped'"
        aria-label="服务实例"
        @row-click="(item) => (lastClicked = item.key)"
      >
        <template #cell-status="{ row }">
          <span class="table-demo__tag" :data-tone="statusMeta[row.status as Instance['status']].tone">
            <i class="table-demo__dot" />
            {{ statusMeta[row.status as Instance['status']].label }}
          </span>
        </template>

        <template #cell-cpu="{ row }">
          <span class="table-demo__cpu">
            <span class="table-demo__cpu-track">
              <span
                class="table-demo__cpu-fill"
                :data-tone="cpuTone(row.cpu as number)"
                :style="{ width: `${row.cpu}%` }"
              />
            </span>
            <span class="table-demo__cpu-num">{{ row.cpu }}%</span>
          </span>
        </template>

        <template #cell-action="{ row }">
          <Button size="small" variant="link" :disabled="row.status === 'stopped'" @click="restart(row)">
            重启
          </Button>
        </template>

        <template #expanded="{ row }">
          <div class="table-demo__detail">
            <p>{{ row.desc }}</p>
            <div class="table-demo__chips">
              <span class="table-demo__chip">区域 · {{ row.region }}</span>
              <span class="table-demo__chip">版本 · {{ row.version }}</span>
              <span class="table-demo__chip">更新 · {{ row.updatedAt }}</span>
            </div>
          </div>
        </template>
      </Table>

      <p class="table-demo__hint">
        实例列左固定、操作列右固定，横向滚动时贴边不动；给出表体高度后表头吸顶。
        状态 / CPU / 操作三列由 <code>cell-{key}</code> 插槽自定义渲染，展开行由
        <code>expanded</code> 插槽承载。已停止的实例不可勾选（<code>isRowSelectable</code>）。
        打开「列宽拖拽」后拖动表头右缘改宽，固定列偏移随之重算。
        <span v-if="lastClicked">最近点击的行：<code>{{ lastClicked }}</code>。</span>
      </p>
    </section>

    <section class="table-demo__block">
      <h3 class="table-demo__title">与 Pagination 组合 · 客户端分页</h3>
      <Table :data="pagedLogs" :columns="logColumns" size="small" stripe aria-label="事件日志">
        <template #cell-level="{ row }">
          <span class="table-demo__tag" :data-tone="row.level === 'ERROR' ? 'danger' : row.level === 'WARN' ? 'warning' : 'info'">
            {{ row.level }}
          </span>
        </template>
      </Table>
      <Pagination v-model="page" :total="logs.length" :page-size="pageSize" size="small" />
    </section>

    <section class="table-demo__block">
      <h3 class="table-demo__title">空态</h3>
      <Table :data="[]" :columns="logColumns" empty-text="没有匹配的记录" aria-label="空表格" />
    </section>

    <section class="table-demo__block">
      <h3 class="table-demo__title">合并单元格 · spanMethod</h3>
      <Table
        :data="mergeData"
        :columns="mergeColumns"
        :span-method="mergeSpan"
        border
        size="small"
        aria-label="区域订单"
      >
        <template #cell-amount="{ row }">¥ {{ row.amount }}</template>
      </Table>
      <p class="table-demo__hint">
        区域列按连续相同值纵向合并：<code>spanMethod</code> 对每组第一格返回
        <code>{ rowspan: N, colspan: 1 }</code>，其余格返回 <code>rowspan: 0</code> 被吞并不渲染。
      </p>
    </section>

    <section class="table-demo__block">
      <h3 class="table-demo__title">复合部件 · 无样式层自行装配</h3>
      <TableRoot :data="crew" :columns="crewColumns" class="table-demo__compound">
        <TableCaption>核心贡献者（本季度）</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead v-for="column in crewColumns" :key="column.key" :column="column.key" />
          </TableRow>
        </TableHeader>
        <TableBody v-slot="{ rows }">
          <TableRow v-for="item in rows" :key="item.key" :item="item">
            <TableCell v-for="column in crewColumns" :key="column.key" :column="column.key">
              {{ item.row[column.key] }}
            </TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell :colspan="2">合计</TableCell>
            <TableCell column="commits">438</TableCell>
          </TableRow>
        </TableFooter>
      </TableRoot>
      <p class="table-demo__hint">
        这段完全由 <code>@agile-plus/ui/table</code> 的部件拼成：表体行序列经
        <code>TableBody</code> 插槽交回，<code>v-for</code> 写在调用侧，表头 / 表尾 / 标题自由摆放。
      </p>
    </section>
  </div>
</template>

<style scoped>
.table-demo {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.table-demo__block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.table-demo__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.table-demo__panel {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 18px;
  align-items: center;
  padding: 14px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}

.table-demo__field {
  display: flex;
  gap: 8px;
  align-items: center;
}

.table-demo__label {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.table-demo__toggle {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  font-size: 13px;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.table-demo__actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.table-demo__bulk {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--y-color-primary);
  background: var(--y-color-primary-bg);
  border: 1px solid var(--y-color-primary);
  border-radius: 8px;
}

.table-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.table-demo__tag {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 1px 9px;
  font-size: 12px;
  line-height: 1.6;
  border-radius: var(--y-border-radius-round);
}

.table-demo__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentcolor;
}

.table-demo__tag[data-tone='success'] {
  color: var(--y-color-success);
  background: var(--y-color-success-bg);
}

.table-demo__tag[data-tone='warning'] {
  color: var(--y-color-warning);
  background: var(--y-color-warning-bg);
}

.table-demo__tag[data-tone='danger'] {
  color: var(--y-color-danger);
  background: var(--y-color-danger-bg);
}

.table-demo__tag[data-tone='info'] {
  color: var(--y-color-info);
  background: var(--y-color-info-bg);
}

.table-demo__tag[data-tone='neutral'] {
  color: var(--y-color-text-secondary);
  background: var(--y-color-fill-secondary);
}

.table-demo__cpu {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.table-demo__cpu-track {
  flex: 1;
  height: 6px;
  overflow: hidden;
  background: var(--y-color-fill-secondary);
  border-radius: var(--y-border-radius-round);
}

.table-demo__cpu-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width var(--y-motion-duration-mid) var(--y-motion-ease-out);
}

.table-demo__cpu-fill[data-tone='success'] {
  background: var(--y-color-success);
}

.table-demo__cpu-fill[data-tone='warning'] {
  background: var(--y-color-warning);
}

.table-demo__cpu-fill[data-tone='danger'] {
  background: var(--y-color-danger);
}

.table-demo__cpu-num {
  width: 38px;
  font-size: 12px;
  color: var(--y-color-text-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.table-demo__detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-demo__detail p {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--y-color-text-secondary);
}

.table-demo__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.table-demo__chip {
  padding: 2px 10px;
  font-size: 12px;
  color: var(--y-color-text-secondary);
  background: var(--y-color-bg-container);
  border: 1px solid var(--y-color-border-secondary);
  border-radius: var(--y-border-radius-round);
}

.table-demo__compound {
  border: 1px solid var(--y-color-border-secondary);
  border-radius: 8px;
}

/* 无样式层只给结构，这里由消费者（示例）补最基本的可读性样式 */
.table-demo__compound :deep(th),
.table-demo__compound :deep(td) {
  padding: 8px 14px;
  text-align: left;
  border-bottom: 1px solid var(--y-color-border-secondary);
}

.table-demo__compound :deep(th) {
  font-weight: 600;
  color: var(--y-color-text-heading);
  background: var(--y-color-fill-quaternary);
}

.table-demo__compound :deep(caption) {
  padding: 8px 14px;
  font-size: 13px;
  color: var(--y-color-text-secondary);
  text-align: left;
}

.table-demo__compound :deep(tfoot td) {
  font-weight: 600;
  border-bottom: 0;
}
</style>