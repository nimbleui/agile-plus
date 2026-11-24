<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import { Select } from '@agile-plus/components/select';
import { VirtualTree } from '@agile-plus/components/virtual-tree';
import { VirtualTree as VirtualTreePrimitive } from '@agile-plus/ui/virtual-tree';

import type { SelectOptionItem } from '@agile-plus/components/select';
import type {
  TreeCheckState,
  TreeDataNode,
  TreeKey,
  TreeSelectionMode,
  VirtualTreeHandle,
} from '@agile-plus/components/virtual-tree';

/** interface 节点可直接作为 data，插槽里的 node 保留 detail 等业务字段类型。 */
interface DemoNode {
  key: string;
  label: string;
  detail?: string;
  disabled?: boolean;
  children?: DemoNode[];
}

/**
 * 无样式层 expose 出来的那部分入口。
 *
 * `defineExpose` 交出的实例代理会把属性上的 ref 解包，所以这里写成值而不是 `Ref` / `ComputedRef`：
 * 按 Ref 声明会让文档站去读一个不存在的 `.value`。
 */
interface PrimitiveApi {
  rows: readonly { key: TreeKey; level: number }[];
  expandedKeys: readonly TreeKey[];
  checkedKeys: readonly TreeKey[];
  checkStates: ReadonlyMap<TreeKey, TreeCheckState>;
  activeKey: TreeKey | null;
  totalSize: string;
}

const DIR_TITLES = ['财务对账', '订单同步', '风控审计', '数据仓库', '客户资料', '运维告警'];

const FILE_TITLES = ['明细表', '汇总报表', '异常清单', '归档快照', '导入模板'];

/** 三条一循环：空 / 一句 / 一段，行高因此真的参差不齐——树里长行是常态而不是例外。 */
const DETAILS = [
  '',
  '本次增量同步覆盖 1,204 个节点，校验后写回 1,188 个。',
  '本次执行处理了 12,480 条记录，其中 37 条因缺少成本中心被跳过；跳过明细已写入审计日志，需要在下个交易日前补齐，否则月度汇总会出现缺口，且补录后仍需重跑当天的对账任务。',
];

function pickAt(list: readonly string[], index: number): string {
  const length = list.length;

  return length === 0 ? '' : (list[((index % length) + length) % length] ?? '');
}

interface ForestProfile {
  dirs: number;
  files: number;
  subDirs: number;
  subFiles: number;
}

const PROFILES: Record<string, ForestProfile> = {
  '660': { dirs: 20, files: 10, subDirs: 2, subFiles: 10 },
  '14500': { dirs: 100, files: 40, subDirs: 4, subFiles: 25 },
  '92000': { dirs: 300, files: 60, subDirs: 6, subFiles: 40 },
};

/** 节点总数按构造式算而不是遍历统计：这三档的形状是固定的。 */
function countProfile(profile: ForestProfile): number {
  return profile.dirs * (1 + profile.files + profile.subDirs * (1 + profile.subFiles));
}

function makeFile(key: string, seed: number, index: number, varied: boolean): DemoNode {
  const node: DemoNode = { key, label: `${pickAt(FILE_TITLES, index + seed)} · ${index}` };

  // 每第 7 个文件是只读的：禁用节点在级联与键盘两条路径上都是一堵墙，演练场里必须看得见。
  if (index % 7 === 3) node.disabled = true;
  if (varied && index % 3 === 1) node.detail = pickAt(DETAILS, index + seed);

  return node;
}

function makeForest(profile: ForestProfile, varied: boolean, seed: number): DemoNode[] {
  return Array.from({ length: profile.dirs }, (_, dirIndex) => {
    const dirKey = `d${dirIndex}`;

    const subDirs = Array.from({ length: profile.subDirs }, (_, subIndex) => {
      const subKey = `${dirKey}.s${subIndex}`;

      return {
        key: subKey,
        label: `${pickAt(DIR_TITLES, dirIndex + subIndex + seed)} 子目录 ${subIndex}`,
        children: Array.from({ length: profile.subFiles }, (_, fileIndex) =>
          makeFile(`${subKey}.f${fileIndex}`, seed, fileIndex, varied)
        ),
      };
    });

    const files = Array.from({ length: profile.files }, (_, fileIndex) =>
      makeFile(`${dirKey}.f${fileIndex}`, seed, fileIndex, varied)
    );

    return {
      key: dirKey,
      label: `${pickAt(DIR_TITLES, dirIndex + seed)} · 目录 ${dirIndex}`,
      children: [...subDirs, ...files],
    };
  });
}

/** 权限树：半选、禁用墙与「整棵子树全禁用」三件事都能在一份数据里同时看见。 */
const PERMISSIONS: DemoNode[] = [
  {
    key: 'orders',
    label: '订单中心',
    children: [
      { key: 'orders.read', label: '查看订单' },
      { key: 'orders.write', label: '创建订单' },
      { key: 'orders.export', label: '导出订单' },
    ],
  },
  {
    key: 'finance',
    label: '财务中心',
    children: [
      { key: 'finance.read', label: '查看对账单' },
      { key: 'finance.lock', label: '期末结账（仅管理员）', disabled: true },
      { key: 'finance.write', label: '录入凭证' },
    ],
  },
  {
    key: 'system',
    label: '系统设置',
    children: [
      {
        key: 'system.log',
        label: '审计日志',
        children: [
          { key: 'system.log.view', label: '查看日志' },
          { key: 'system.log.purge', label: '清空日志（仅管理员）', disabled: true },
        ],
      },
      { key: 'system.role', label: '角色管理' },
    ],
  },
];

/** 组织架构：块三用它演示三格插槽被整体换掉之后的样子。 */
const ORG: DemoNode[] = [
  {
    key: 'hq',
    label: '总部',
    children: [
      {
        key: 'hq.rd',
        label: '研发中心',
        children: [
          { key: 'hq.rd.fe', label: '前端组' },
          { key: 'hq.rd.be', label: '服务端组', disabled: true },
        ],
      },
      { key: 'hq.ops', label: '运维部' },
    ],
  },
  {
    key: 'branch',
    label: '华东分部',
    children: [{ key: 'branch.cs', label: '客服中心' }],
  },
];

const profileChoices: SelectOptionItem[] = [
  { value: '660', label: '约 660 个节点' },
  { value: '14500', label: '约 14,500 个节点' },
  { value: '92000', label: '约 92,000 个节点' },
];

const variedChoices: SelectOptionItem[] = [
  { value: 'true', label: '长短交替（动态高度）' },
  { value: 'false', label: '全部单行（等高）' },
];

const selectionChoices: SelectOptionItem[] = [
  { value: 'none', label: 'none 不可选中' },
  { value: 'single', label: 'single 单选' },
  { value: 'multiple', label: 'multiple 多选' },
];

const pgProfileKey = ref('14500');
const pgVariedKey = ref('true');
const pgSelection = ref<TreeSelectionMode>('single');
const pgCheckable = ref(true);
const pgEstimate = ref(40);
const pgOverscan = ref(3);
const pgHeight = ref(320);
const pgTargetKey = ref('d40.s2.f1');
const pgSeed = ref(0);

const treeHandle = ref<VirtualTreeHandle | null>(null);

const pgExpanded = ref<TreeKey[]>(['d0']);
const pgSelected = ref<TreeKey[]>([]);
const pgChecked = ref<TreeKey[]>([]);
const pgActive = ref<TreeKey | null>(null);

/** 块三的树走受控用法，所以初始展开写在 ref 的初值里，而不是 `default-expanded-keys`。 */
const orgExpanded = ref<TreeKey[]>(['hq', 'hq.rd']);
const orgChecked = ref<TreeKey[]>([]);

const pgData = computed(() =>
  makeForest(PROFILES[pgProfileKey.value], pgVariedKey.value === 'true', pgSeed.value)
);

const pgTotal = computed(() => countProfile(PROFILES[pgProfileKey.value]));

/**
 * 整体换数据、全部展开这类动作的耗时读数。
 *
 * 只给一个总耗时而不拆成「重建索引 / 展平」两段：索引与展平都发生在无头层的 computed 里，
 * 文档站拿不到它们各自的计时点，拆开来写只能是估的。这个数是「按下按钮到 DOM 更新完成」，
 * 包含渲染本身，所以它比算法耗时更大，但也只有它是本页真实量出来的。
 */
const pgTiming = ref<{ action: string; ms: string } | null>(null);

async function pgTimed(action: string, run: () => void): Promise<void> {
  const start = performance.now();

  run();
  await nextTick();

  pgTiming.value = { action, ms: (performance.now() - start).toFixed(1) };
}

/** 整体换数据：键不变则三条状态通道原样保留，种子变了就换一批标题，用来验证按下标记账的高度。 */
function pgReplace(): void {
  pgSeed.value += 1;
}

function pgInvalidate(): void {
  treeHandle.value?.invalidateMeasurements();
}

/**
 * 定位一个键，并把它的祖先补进展开集合。
 *
 * `scrollToKey` 刻意不代替调用方展开祖先——折叠里的行没有下标可滚。所以「跳转到某个节点」
 * 在业务侧就是这两步：先展开祖先，等行序列重排完再定位。键名里的 `.` 正好能切出祖先链。
 */
async function pgReveal(): void {
  const key = pgTargetKey.value.trim();

  if (!key) return;

  const ancestors = key.split('.').map((_, index, parts) => parts.slice(0, index + 1).join('.'));

  pgExpanded.value = [...new Set([...pgExpanded.value, ...ancestors.slice(0, -1)])];

  await nextTick();

  treeHandle.value?.scrollToKey(key);
}

function pgReset(): void {
  pgProfileKey.value = '14500';
  pgVariedKey.value = 'true';
  pgSelection.value = 'single';
  pgCheckable.value = true;
  pgEstimate.value = 40;
  pgOverscan.value = 3;
  pgHeight.value = 320;
  pgSeed.value = 0;
  pgExpanded.value = ['d0'];
  pgSelected.value = [];
  pgChecked.value = [];
  pgActive.value = null;
  pgTiming.value = null;

  treeHandle.value?.collapseAll();
}

const rawApi = ref<PrimitiveApi | null>(null);

/** 半选键直接列出来：显式集合里永远没有它们，这一份是从子节点回读出来的。 */
const rawIndeterminate = computed(() => {
  const states = rawApi.value?.checkStates;

  if (!states) return [];

  return [...states].filter(([, state]) => state === 'indeterminate').map(([key]) => key);
});

function labelOf(node: TreeDataNode): string {
  return String(node['label'] ?? '');
}

function detailOf(node: TreeDataNode): string {
  return String(node['detail'] ?? '');
}

function checkGlyph(state: TreeCheckState): string {
  if (state === 'checked') return '✓';
  if (state === 'indeterminate') return '−';

  return '';
}
</script>

<template>
  <div class="virtual-tree-demo">
    <section class="virtual-tree-demo__block">
      <h4>实时演练场</h4>

      <p class="virtual-tree-demo__hint">
        数据规模、内容形态、选中模式、级联勾选、预估行高、预渲染行数与容器高度即时生效。
        折叠状态下十万级节点只有顶层若干行进入渲染窗口；点「展开全部」会一次性写出全部键，
        行序列随之重排——这也是展开态唯一需要 O(节点数) 的一次操作。把「预渲染行数」拉到 0
        再快速滚动，能直接看到视口边缘的空白。
      </p>

      <div class="virtual-tree-demo__panel">
        <div class="virtual-tree-demo__ctrl">
          <span>数据规模</span>
          <Select v-model="pgProfileKey" :options="profileChoices" size="small" />
        </div>

        <div class="virtual-tree-demo__ctrl">
          <span>内容形态</span>
          <Select v-model="pgVariedKey" :options="variedChoices" size="small" />
        </div>

        <div class="virtual-tree-demo__ctrl">
          <span>选中模式</span>
          <Select v-model="pgSelection" :options="selectionChoices" size="small" />
        </div>

        <div class="virtual-tree-demo__ctrl">
          <span>父子级联勾选</span>
          <input v-model="pgCheckable" type="checkbox" />
        </div>

        <label class="virtual-tree-demo__ctrl">
          <span>预估行高 {{ pgEstimate }}px</span>
          <input v-model.number="pgEstimate" type="range" min="20" max="120" step="5" />
        </label>

        <label class="virtual-tree-demo__ctrl">
          <span>预渲染行数 {{ pgOverscan }}</span>
          <input v-model.number="pgOverscan" type="range" min="0" max="8" step="1" />
        </label>

        <label class="virtual-tree-demo__ctrl">
          <span>容器高度 {{ pgHeight }}px</span>
          <input v-model.number="pgHeight" type="range" min="160" max="480" step="20" />
        </label>

        <label class="virtual-tree-demo__ctrl">
          <span>定位到键</span>
          <input v-model="pgTargetKey" type="text" spellcheck="false" />
        </label>

        <div class="virtual-tree-demo__ctrl-actions">
          <button
            type="button"
            class="virtual-tree-demo__button"
            @click="pgTimed('展开全部', () => treeHandle?.expandAll())"
          >
            展开全部
          </button>
          <button
            type="button"
            class="virtual-tree-demo__button"
            @click="pgTimed('收起全部', () => treeHandle?.collapseAll())"
          >
            收起全部
          </button>
          <button type="button" class="virtual-tree-demo__button" @click="pgReveal">
            定位并展开祖先
          </button>
          <button
            type="button"
            class="virtual-tree-demo__button"
            @click="treeHandle?.clearSelection()"
          >
            清空选中
          </button>
          <button
            type="button"
            class="virtual-tree-demo__button"
            @click="pgTimed('替换全部', pgReplace)"
          >
            替换全部
          </button>
          <button type="button" class="virtual-tree-demo__button" @click="pgInvalidate">
            重量高度
          </button>
          <button type="button" class="virtual-tree-demo__button" @click="pgReset">重置</button>
        </div>
      </div>

      <VirtualTree
        ref="treeHandle"
        v-model:expanded-keys="pgExpanded"
        v-model:selected-keys="pgSelected"
        v-model:checked-keys="pgChecked"
        v-model:active-key="pgActive"
        :data="pgData"
        :selection="pgSelection"
        :checkable="pgCheckable"
        :estimate-size="pgEstimate"
        :overscan="pgOverscan"
        :height="pgHeight"
      >
        <template #default="{ node }">
          <div class="virtual-tree-demo__cell">
            <span class="virtual-tree-demo__label">{{ labelOf(node) }}</span>
            <p v-if="detailOf(node)" class="virtual-tree-demo__detail">{{ detailOf(node) }}</p>
          </div>
        </template>
      </VirtualTree>

      <p class="virtual-tree-demo__value">
        共 <code>{{ pgTotal.toLocaleString('en-US') }}</code> 个节点 · 已展开
        <code>{{ pgExpanded.length }}</code> 个分支 · 选中
        <code>{{ pgSelected.join('、') || '—' }}</code> · 活动 <code>{{ pgActive || '—' }}</code> ·
        勾选集合 <code>{{ pgChecked.length ? pgChecked.join('、') : '—' }}</code>
      </p>

      <p class="virtual-tree-demo__hint">
        勾选集合是**级联之后的最小集合**：勾一个分支只会写入它自己与后代，祖先的键被摘掉，
        它们的三态由子节点回读得出。半选永远不在这个集合里。
      </p>

      <p v-if="pgTiming" class="virtual-tree-demo__value">
        最近一次 <b>{{ pgTiming.action }}</b> 到 DOM 更新完成用了
        <code>{{ pgTiming.ms }} ms</code> · 当前展开 <code>{{ pgExpanded.length }}</code> 个分支 ·
        节点总数见上一条。行序列是 O(全部行)， 十万级数据点一次展开的成本就在这一行数字里。
      </p>
    </section>

    <section class="virtual-tree-demo__block">
      <h4>级联勾选、半选与禁用墙</h4>

      <p class="virtual-tree-demo__hint">
        这一格用的是 <code>@agile-plus/ui/virtual-tree</code>：没有 CSS，行外观由本页样式给出， 而
        <code>checkStates</code> 直接从组件 expose
        读得到——成品层刻意只转发动作，要看三态就来这一层。 试试这三处：<b>订单中心</b>
        勾一次整棵子树点亮；<b>财务中心</b> 的「期末结账」是禁用节点，
        它不参与汇总，所以两个可参与子节点全选后父节点就是选中而不是半选；
        <b>审计日志</b> 的子节点里只剩一个可参与，勾上它父节点直接是选中而不是半选。
      </p>

      <VirtualTreePrimitive
        ref="rawApi"
        class="virtual-tree-demo__raw"
        :data="PERMISSIONS"
        :default-expanded-keys="['orders', 'finance', 'system', 'system.log']"
        checkable
        :estimate-size="32"
        :overscan="2"
        :height="260"
      >
        <template #toggle="{ expanded }">
          <span class="virtual-tree-demo__arrow" :data-expanded="expanded">▸</span>
        </template>

        <template #checkbox="{ state }">
          <span class="virtual-tree-demo__box" :data-state="state">{{ checkGlyph(state) }}</span>
        </template>

        <template #default="{ node }">
          <span class="virtual-tree-demo__label">{{ labelOf(node) }}</span>
        </template>
      </VirtualTreePrimitive>

      <p class="virtual-tree-demo__value">
        显式勾选 <code>{{ rawApi?.checkedKeys.join('、') || '—' }}</code> · 半选
        <code>{{ rawIndeterminate.join('、') || '—' }}</code> · 可见行
        <code>{{ rawApi?.rows.length }}</code> 行 · 总高 <code>{{ rawApi?.totalSize }}</code>
      </p>
    </section>

    <section class="virtual-tree-demo__block">
      <h4>三格插槽：箭头、勾选框、内容都换得掉</h4>

      <p class="virtual-tree-demo__hint">
        成品层的三个格子各有默认形状，也都能被插槽整体替换；替换只发生在格子内部，
        <code>data-part="toggle"</code> / <code>data-part="checkbox"</code> 这两层包裹以及它们上的
        点击与 <code>stop</code> 换不掉——勾选状态的真源在无头层，DOM 契约不该由插槽改写。
      </p>

      <VirtualTree
        v-model:expanded-keys="orgExpanded"
        v-model:checked-keys="orgChecked"
        :data="ORG"
        selection="multiple"
        checkable
        :estimate-size="32"
        :height="220"
      >
        <template #toggle="{ row }">
          <span class="virtual-tree-demo__sign" :data-expanded="row.expanded">
            {{ row.expanded ? '−' : '+' }}
          </span>
        </template>

        <template #checkbox="{ state }">
          <span class="virtual-tree-demo__box" :data-state="state">{{ checkGlyph(state) }}</span>
        </template>

        <template #default="{ row, node, selected }">
          <span class="virtual-tree-demo__label">{{ labelOf(node) }}</span>
          <span class="virtual-tree-demo__badge">L{{ row.level + 1 }}</span>
          <span v-if="selected" class="virtual-tree-demo__badge">已选中</span>
        </template>
      </VirtualTree>

      <p class="virtual-tree-demo__value">
        勾选集合 <code>{{ orgChecked.join('、') || '—' }}</code> · 展开
        <code>{{ orgExpanded.join('、') || '—' }}</code>
      </p>
    </section>
  </div>
</template>

<style scoped>
.virtual-tree-demo {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.virtual-tree-demo__block h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.virtual-tree-demo__hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.virtual-tree-demo__panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px 16px;
  padding: 16px;
  margin-bottom: 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}

.virtual-tree-demo__ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.virtual-tree-demo__ctrl :deep(.y-select) {
  width: 100%;
}

.virtual-tree-demo__ctrl input[type='range'],
.virtual-tree-demo__ctrl input[type='text'] {
  width: 100%;
}

.virtual-tree-demo__ctrl input[type='range'] {
  accent-color: var(--vp-c-brand-1);
}

.virtual-tree-demo__ctrl input[type='text'] {
  padding: 3px 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.virtual-tree-demo__ctrl-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: end;
  grid-column: 1 / -1;
}

.virtual-tree-demo__button {
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.virtual-tree-demo__button:hover {
  border-color: var(--vp-c-brand-1);
}

.virtual-tree-demo__cell {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.virtual-tree-demo__label {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.virtual-tree-demo__detail {
  /* .vp-doc 给 p 加了 20px 上下外边距，落在行里会把行高撑成两倍。 */
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-3);
}

.virtual-tree-demo__badge {
  flex: none;
  padding: 1px 6px;
  font-size: 11px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 999px;
}

.virtual-tree-demo__value {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

/* 无样式层不带任何外观，这一格用页面样式替它补上，正好演示「样式完全可替换」。 */
.virtual-tree-demo__raw {
  font-size: 13px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

/* 焦点环画在滚动容器上：环若落在 content 上，它会沿整棵树的总高绕一圈。 */
.virtual-tree-demo__raw:focus-within {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -2px;
}

.virtual-tree-demo__raw :deep([data-part='content']) {
  outline: none;
}

.virtual-tree-demo__raw :deep([data-part='row']) {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 4px 10px 4px calc(10px + var(--y-tree-level, 0) * 14px);
  cursor: pointer;
  border-bottom: 1px solid var(--vp-c-divider);
}

.virtual-tree-demo__raw :deep([data-part='row'][data-selected]) {
  background: var(--vp-c-brand-soft);
}

.virtual-tree-demo__arrow {
  display: inline-block;
  width: 12px;
  font-size: 11px;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: transform 0.16s ease;
}

.virtual-tree-demo__arrow[data-expanded] {
  transform: rotate(90deg);
}

.virtual-tree-demo__box {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 11px;
  line-height: 1;
  color: #fff;
  cursor: pointer;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
}

.virtual-tree-demo__box[data-state='checked'],
.virtual-tree-demo__box[data-state='indeterminate'] {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.virtual-tree-demo__sign {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

.virtual-tree-demo__sign[data-expanded] {
  color: var(--vp-c-brand-1);
}
</style>
