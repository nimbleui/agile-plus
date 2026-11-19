<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import TableDemo from '../.vitepress/components/TableDemo.vue';
</script>

# Table 表格

以原生 `<table>` 语义为底座的数据表格：列模型驱动渲染，排序 / 选择 / 展开三条状态通道各自独立受控，固定表头与固定列由 sticky 几何纯计算得出。逻辑全部下沉到 `@agile-plus/primitives/table` 与 `@agile-plus/headless/useTable`，结构拆成 `@agile-plus/ui/table` 的十三个复合部件，成品 `Table` 只是替消费者完成装配并补上样式。

## 基础示例

<Preview description="上方演练场的每个控件即时作用于表格：尺寸、表体高度、斑马纹、全边框、选择列、展开列、加载中。实例列左固定、操作列右固定，状态 / CPU / 操作三列走自定义插槽。下方依次是与 Pagination 组合的客户端分页、空态、以及完全由无样式部件自行装配的复合用法。">
  <TableDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Table } from '@agile-plus/components/table';

import type { TableColumn } from '@agile-plus/primitives/table';

const columns: TableColumn[] = [
  { key: 'name', title: '名称', sortable: true },
  { key: 'age', title: '年龄', sortable: true, align: 'right' },
];

const data = ref([
  { key: 'a', name: '林晚', age: 30 },
  { key: 'b', name: '周野', age: 25 },
]);

const selectedKeys = ref([]);
</script>

<template>
  <Table
    v-model:selected-keys="selectedKeys"
    :data="data"
    :columns="columns"
    selection
    stripe
    :max-height="360"
  />
</template>
```

## Table

### Props

| 属性                  | 类型                             | 默认值       | 说明                                                                 |
| --------------------- | -------------------------------- | ------------ | -------------------------------------------------------------------- |
| `data`                | `TableRowData[]`                 | `[]`         | 行数据；分页由外部完成时即当前页数据                                  |
| `columns`             | `TableColumn[]`                  | `[]`         | 列模型，见下表                                                        |
| `rowKey`              | `string \| ((row) => string)`    | `'key'`      | 行键字段名或取值函数；缺省读 `key` 字段，缺失时回退行下标             |
| `selection`           | `boolean`                        | `false`      | 启用选择列（全选框 + 行框）                                           |
| `isRowSelectable`     | `(row) => boolean`               | —            | 行级可选判定，返回 `false` 的行不参与勾选与全选                       |
| `expandable`          | `boolean`                        | `false`      | 启用展开列                                                            |
| `resizable`           | `boolean`                        | `false`      | 启用列宽拖拽；表头右缘出现手柄，拖动改宽，固定列偏移随之重算          |
| `spanMethod`          | `TableSpanMethod`                | —            | 单元格合并方法，逐格返回 `{ rowspan, colspan }` 或 `[rowspan, colspan]` |
| `v-model:sort`        | `TableSortState \| null`         | —            | 受控排序；`null` 是「明确不排序」的合法值                             |
| `defaultSort`         | `TableSortState \| null`         | `null`       | 非受控初始排序                                                        |
| `v-model:selectedKeys`| `string[]`                       | —            | 受控已选行键；跨页保留                                                |
| `defaultSelectedKeys` | `string[]`                       | `[]`         | 非受控初始已选键                                                      |
| `v-model:expandedKeys`| `string[]`                       | —            | 受控展开行键                                                          |
| `defaultExpandedKeys` | `string[]`                       | `[]`         | 非受控初始展开键                                                      |
| `stripe`              | `boolean`                        | `false`      | 斑马纹（按数据行下标交替，展开行不打断）                              |
| `border`              | `boolean`                        | `false`      | 全边框（纵向分隔线）                                                  |
| `size`                | `'small' \| 'middle' \| 'large'` | `'middle'`   | 尺寸变体                                                              |
| `loading`             | `boolean`                        | `false`      | 加载遮罩 + 旋转指示，根节点挂 `aria-busy`                             |
| `height`              | `number \| string`               | —            | 表体固定高度；给出后表头吸顶、表体垂直滚动                            |
| `maxHeight`           | `number \| string`               | —            | 表体最大高度；超出后表头吸顶、表体垂直滚动                            |
| `emptyText`           | `string`                         | `'暂无数据'` | 空态文案                                                              |
| `showHeader`          | `boolean`                        | `true`       | 是否渲染表头                                                          |
| `ariaLabel`           | `string`                         | —            | `table` 的可访问名                                                    |

### TableColumn

| 字段          | 类型                          | 说明                                                       |
| ------------- | ----------------------------- | ---------------------------------------------------------- |
| `key`         | `string`                      | 列唯一标识，排序状态与插槽名都引用它                       |
| `title`       | `string`                      | 表头文案                                                   |
| `dataIndex`   | `string`                      | 取值字段，缺省与 `key` 相同                                |
| `width`       | `number \| string`            | 列宽；数字按 px，字符串原样透传                            |
| `minWidth`    | `number`                      | 拖拽改宽的最小像素宽度，缺省 `60`                          |
| `align`       | `'left' \| 'center' \| 'right'` | 单元格对齐，缺省 `left`                                  |
| `headerAlign` | `'left' \| 'center' \| 'right'` | 表头对齐，缺省跟随 `align`                               |
| `fixed`       | `'left' \| 'right'`           | 固定到哪一侧；**必须配合数字 `width`** 才生效              |
| `sortable`    | `boolean`                     | 是否可排序                                                 |
| `sorter`      | `(a, b) => number`            | 自定义比较器；缺省按字段值（数字按数值、其余按字符串）     |
| `ellipsis`    | `boolean`                     | 单元格单行省略（依赖 fixed 布局的确定列宽）                |

### Events

| 事件                  | 参数                                  | 说明                       |
| --------------------- | ------------------------------------- | -------------------------- |
| `update:sort`         | `(sort: TableSortState \| null)`      | 排序变化                   |
| `update:selectedKeys` | `(keys: string[])`                    | 已选键变化                 |
| `update:expandedKeys` | `(keys: string[])`                    | 展开键变化                 |
| `columnResize`        | `(key: string, width: number)`        | 列宽拖拽抬起后触发         |
| `rowClick`            | `(item: TableBodyRow, event)`         | 数据行点击                 |
| `rowDblclick`         | `(item: TableBodyRow, event)`         | 数据行双击                 |

### Slots

| 插槽            | 作用域参数                  | 说明                          |
| --------------- | --------------------------- | ----------------------------- |
| `cell-{key}`    | `{ row, column, index }`    | 自定义某列单元格内容          |
| `head-{key}`    | `{ column }`                | 自定义某列表头内容            |
| `expanded`      | `{ row, index }`            | 展开行内容                    |
| `empty`         | —                           | 空态内容（覆盖 `emptyText`）  |
| `footer`        | —                           | 表尾（渲染为 `tfoot`）        |

## 排序规则

单列排序，循环与主流表格一致，全部在 primitives 层可单测：

- **三态循环**：新列从升序起步，同一列按 升序 → 降序 → 取消（回到数据原序）。
- **缺省比较器**：空值（`null` / `undefined` / 非有限数）恒排最后；两个数字按数值比；其余转字符串按字典序比。不做 locale 感知，保证 node 单测与浏览器结果逐字一致；需要自然序 / 拼音序的列用 `sorter` 自定义。
- **稳定排序**：相等行保持原相对顺序，切换方向时同值行不跳动。
- **失效兜底**：排序状态指向不存在或不可排序的列时静默退回原序，表格仍可用。

## 选择与展开

- **全选只作用本页**：全选框三态由当前页可选行的选中比例派生；勾选 / 取消只并入或移除当前页可选键，其他页已选键原样保留（跨页保留选择）。
- **禁用行**：`isRowSelectable` 返回 `false` 的行框置灰、点击无效，也不把全选框拖成半选；没有可选行时全选框禁用。
- **展开行**：键在 `expandedKeys` 里的数据行紧随其后渲染一条展开内容行，`aria-controls` 指向内容格；展开行继承数据行的 `row` 与 `index`。

## 固定表头与固定列

- **固定表头**：给出 `height` / `maxHeight` 后，滚动容器落在 `[data-part='root']`，表头 `th` 以 `position: sticky; top: 0` 吸顶。
- **固定列**：`fixed` + 数字 `width` 的列以 sticky 贴边，偏移由同侧在前固定列的宽度累加得出（纯计算，无 DOM 测量）。滚动阴影只画在同侧最后一个固定列的交界上。**缺数字宽度的固定列会退化为普通列**——sticky 偏移赖以成立的确定列宽不存在。
- **布局算法**：任一列声明宽度或固定时用 `table-layout: fixed`，否则 `auto`。

## 合并单元格

`spanMethod` 与 Element Plus 的 `span-method` 同形：逐格调用，入参 `{ row, column, rowIndex, columnIndex }`（`columnIndex` 是数据列下标，不含选择 / 展开列），返回 `{ rowspan, colspan }` 或 `[rowspan, colspan]`。返回 `0` 的格子被相邻格吞并、整个 `td` 不渲染；缺省返回 `undefined` 即不合并。

```vue
<Table :data="data" :columns="columns" :span-method="spanMethod" border />
```

```ts
// 按区域纵向合并：每组第一格 rowspan=N，其余格 rowspan=0
function spanMethod({ row, rowIndex, columnIndex }) {
  if (columnIndex !== 0) return;
  if (rowIndex > 0 && data[rowIndex - 1].region === row.region) return { rowspan: 0, colspan: 1 };
  let rowspan = 1;
  for (let i = rowIndex + 1; i < data.length && data[i].region === row.region; i++) rowspan++;
  return { rowspan, colspan: 1 };
}
```

复合层两条路径：`TableCell` 显式传 `rowspan` / `colspan` 手动合并；或在 Root 配 `spanMethod` 后由行级上下文自动派生（`TableRow` 向内部单元格下发所属行，无需逐格手传 `row`）。归一化纯函数 `resolveTableCellSpan` 在 primitives 层可单测：`0` 保留、负数与非有限数回退 `1`、小数向下取整。

## 列宽拖拽

`resizable` 开启后表头右缘渲染拖拽手柄（`role="separator"`）。按下时 ui 层量好 `th` 的像素宽度交给 headless，移动量换算成新宽度并夹到 `minWidth`（缺省 60），监听生命周期由 `usePointerDrag` 收口（与 Slider / ScrollArea 同一底座，作用域销毁自动释放）。抬起派发 `columnResize(key, width)`，系统中断不派发。

- **固定列联动**：列宽覆盖态参与固定列几何派生，拖动固定列后后续固定列的 sticky 偏移自动重算。
- **布局**：`resizable` 强制 `table-layout: fixed`，拖拽期间整表光标锁定 `col-resize` 并禁选。
- **重置**：组件 expose `resetColumnWidths()` 清空拖拽覆盖、回到列模型配置。

```vue
<Table ref="tableRef" :data="data" :columns="columns" resizable @column-resize="onResize" />
<Button @click="tableRef.resetColumnWidths()">重置列宽</Button>
```

## 无样式层用法

十三个复合部件都在 `@agile-plus/ui/table`，**表体行序列由消费者自己 `v-for`**——`TableBody` 通过默认插槽把 `rows` 交回，结构与内容完全自定义：

```vue
<script setup lang="ts">
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

const columns = [
  { key: 'name', title: '成员', sortable: true },
  { key: 'commits', title: '提交数', align: 'right', sortable: true },
];
const data = [
  { key: 'c1', name: '林晚', commits: 128 },
  { key: 'c2', name: '周野', commits: 214 },
];
</script>

<template>
  <TableRoot :data="data" :columns="columns">
    <TableCaption>核心贡献者</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead v-for="c in columns" :key="c.key" :column="c.key" />
      </TableRow>
    </TableHeader>
    <TableBody #default="{ rows }">
      <TableRow v-for="item in rows" :key="item.key" :item="item">
        <TableCell v-for="c in columns" :key="c.key" :column="c.key">
          {{ item.row[c.key] }}
        </TableCell>
      </TableRow>
    </TableBody>
    <TableFooter>
      <TableRow>
        <TableCell :colspan="2">合计</TableCell>
        <TableCell column="commits">342</TableCell>
      </TableRow>
    </TableFooter>
  </TableRoot>
</template>
```

| 部件                  | 渲染            | 说明                                                                 |
| --------------------- | --------------- | -------------------------------------------------------------------- |
| `TableRoot`           | `div > table`   | 状态宿主；默认插槽暴露 `rows` / `columns` / `sort` / `selectedKeys` / `expandedKeys` |
| `TableCaption`        | `caption`       | 表格标题，须为 table 首个子节点                                      |
| `TableHeader`         | `thead`         | 纯结构容器                                                            |
| `TableBody`           | `tbody`         | 默认插槽暴露 `rows`（数据行 + 展开行）                                |
| `TableFooter`         | `tfoot`         | 汇总行容器                                                            |
| `TableRow`            | `tr`            | 传 `item` 才有选中 / 展开 / 禁用态与行事件；表头 / 表尾不传           |
| `TableHead`           | `th`            | `column` 引用列键；可排序列把内容包进排序按钮                         |
| `TableCell`           | `td`            | `column` 引用列键，派生对齐与固定列几何；`rowspan` / `colspan` 手动合并，或经行级上下文自动合并 |
| `TableEmpty`          | `tr > td`       | 空态行，`colspan` 缺省按列数 + 选择列 + 展开列核算                    |
| `TableSelectionHead`  | `th > Checkbox` | 全选框，复用 Checkbox 体系                                            |
| `TableSelectionCell`  | `td > Checkbox` | 行选择框                                                              |
| `TableExpandTrigger`  | `button`        | 展开触发，`aria-expanded` + `aria-controls`                           |
| `TableExpandedRow`    | `tr > td`       | 展开内容行，td 的 id 与触发按钮的 `aria-controls` 同源                |

带样式的 `Table` 内部替你完成了这段装配（并补上 colgroup、状态标签插槽与加载遮罩）；需要完全自定义结构时绕过它自行装配即可。

## 无障碍行为

| 项         | 说明                                                                                   |
| ---------- | -------------------------------------------------------------------------------------- |
| 语义       | 原生 `table / thead / tbody / tfoot / caption / th[scope=col]`，不引入 grid 角色        |
| 排序       | `aria-sort` 只落在正在排序的那一列（ascending / descending），其余列不输出              |
| 选择       | 选中态由行内复选框的 `aria-checked` 权威表达（含半选 `mixed`）；行属性只服务样式        |
| 展开       | 触发按钮 `aria-expanded` + `aria-controls` 指向展开内容格，读屏可直接跳过去             |
| 加载       | 根节点 `aria-busy`，遮罩 `role="status"` 带可访问名                                     |
| 焦点       | 排序按钮、展开按钮、复选框均有 `focus-visible` 焦点环                                   |
| 减少动效   | `prefers-reduced-motion` 下关闭行 / 箭头过渡，spinner 放慢但仍可识别                    |

## 样式钩子

```text
.y-table                                  根（div）
.y-table--small / --middle / --large      尺寸变体
.y-table--stripe / --border               斑马纹 / 全边框
[data-part='root']                        滚动容器
[data-part='table']                       table
[data-part='head'] / [data-part='cell']   表头格 / 数据格
[data-part='sort'][data-order='asc|desc|none']  排序按钮三态
[data-part='row'][data-selected]          选中行
[data-part='row'][data-disabled]          禁用行
[data-striped]                            斑马纹行
[data-fixed='left|right']                 固定列
[data-fixed-edge='left|right']            固定区交界列（滚动阴影）
[data-part='expand-trigger'][data-state]  展开按钮
[data-part='loading-mask'] / spinner      加载遮罩
```

组件级变量：`--y-table-text`、`--y-table-bg`、`--y-table-header-bg`、`--y-table-border`、`--y-table-row-hover-bg`、`--y-table-stripe-bg`、`--y-table-selected-bg`、`--y-table-accent`、`--y-table-fixed-shadow`、`--y-table-radius`、`--y-table-selection-col-width`、`--y-table-expand-col-width`、`--y-table-cell-padding`、`--y-table-height`、`--y-table-max-height`、`--y-table-layout`、`--y-table-fixed-offset`、`--y-table-z-*`。全部消费语义化 Token，随 `html[data-theme='dark']` 自动翻转。

## Headless 层

```ts
import { useTable } from '@agile-plus/headless/useTable';

const table = useTable({
  data: () => props.data,
  columns: () => props.columns,
  selection: true,
  onSelectedKeysChange: (keys) => emit('update:selectedKeys', keys),
});

table.rows.value; // 排序 + 展开扁平化后的表体行序列
table.sort.value; // { key, order } | null
table.selectionState.value; // 'checked' | 'indeterminate' | 'unchecked'
table.toggleSort('name');
table.toggleRowSelection('a');
table.toggleAllSelection();
table.toggleRowExpanded('a');
table.getHeadProps('name'); // { scope, 'aria-sort', 'data-fixed', style, … }
table.getCellSpan(row, 'name', 0); // { rowspan, colspan, removed }
table.setColumnWidth('name', 180); // 夹到 minWidth
table.startColumnResize('name', startX, startWidth); // 拖拽改宽
table.resetColumnWidths();
```

三条状态通道各自走可控 / 非受控协议（`useControllable`），`undefined` 是唯一非受控判据；`data` / `columns` 等接收 `MaybeRefOrGetter`，接口换数据自动重算。`rowKey` 是创建期快照（取值函数与 getter 在运行时无法区分，刻意不收 `MaybeRefOrGetter`）。

## Primitives 层

```ts
import {
  getNextTableSortState,
  getTableSelectionState,
  sortTableRows,
  getTableBodyRows,
  getTableFixedOffsets,
  resolveTableCellSpan,
} from '@agile-plus/primitives/table';

getNextTableSortState({ key: 'name', order: 'desc' }, 'name'); // null（取消）
getTableSelectionState(['a'], ['a', 'b']); // 'indeterminate'
sortTableRows(rows, columns, { key: 'age', order: 'asc' }); // 新数组，不改入参
getTableBodyRows(rows, 'key', ['a']); // 数据行 + 展开行
getTableFixedOffsets([{ key: 'name', fixed: 'left', width: 120 }]);
// { name: { side: 'left', offset: 0, edge: true } }
resolveTableCellSpan([2, 0]); // { rowspan: 2, colspan: 0 }
```

## 已知限制

- **树形数据、虚拟滚动、列筛选、多列排序、键盘改列宽**尚未实现：超出当前范围，后续按需演进（列宽拖拽目前仅指针操作）。
- **固定列必须给数字宽度**：缺宽度的固定列退化为普通列（sticky 偏移无法计算）。
- **行键回退**：`rowKey` 字段缺失时回退行下标，排序 / 翻页后下标指向不同的行；跨页选择、展开记忆必须显式给出稳定 `rowKey`。
- **物料登记暂缓**：低代码物料协议尚不支持数组型属性（平台缺列表设置器），`data` / `columns` 无法在属性面板表达，因此 Table 暂不登记为物料。