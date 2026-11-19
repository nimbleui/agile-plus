<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import PaginationDemo from '../.vitepress/components/PaginationDemo.vue';
</script>

# Pagination 分页

WAI-ARIA APG Pagination 模式：`<nav>` 地标包一条页码带，当前页用 `aria-current="page"` 表达。页码窗口（省略号、首尾固定页、兄弟页）由 `@agile-plus/primitives/pagination` 纯函数算出，本页只需要喂 `total` 与 `pageSize`。

## 基础示例

<Preview description="第一段是最常用的 total + pageSize；第二段固定 pageCount 并加宽窗口；第三段展示禁用与三种尺寸；第四段是非受控 defaultValue 起步；第五段打开页码跳转。">
  <PaginationDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Pagination } from '@agile-plus/components/pagination';

const page = ref(1);
</script>

<template>
  <Pagination v-model="page" :total="100" :page-size="10" />

  <Pagination :page-count="7" :sibling-count="2" :boundary-count="2" />

  <Pagination :total="40" disabled size="large" />

  <Pagination v-model="page" :total="100" show-jumper />
</template>
```

## Pagination

### Props

| 属性            | 类型                             | 默认值     | 说明                                                               |
| --------------- | -------------------------------- | ---------- | ------------------------------------------------------------------ |
| `v-model`       | `number`                         | —          | 当前页码；不传即非受控，组件自己持有                               |
| `defaultValue`  | `number`                         | `1`        | 非受控起始页；越界值会被钳回合法区间                               |
| `total`         | `number`                         | `0`        | 数据总条数；与 `pageSize` 一起决定总页数（向上取整，至少 1）       |
| `pageSize`      | `number`                         | `10`       | 每页条数；非正数回退到 10                                          |
| `pageCount`     | `number`                         | —          | 直接指定总页数；给了它就不再管 `total` / `pageSize`                |
| `siblingCount`  | `number`                         | `1`        | 当前页左右各保留几个兄弟页码；`0` 也合法                           |
| `boundaryCount` | `number`                         | `1`        | 首尾各固定显示几页；`0` 也合法                                     |
| `disabled`      | `boolean`                        | `false`    | 整条禁用：页码与翻页按钮全部不可点，程序写入也被吞掉               |
| `ariaLabel`     | `string`                         | `'分页'`   | `nav` 地标名称；同一页面有多个分页条时必须区分开                   |
| `showJumper`    | `boolean`                        | `false`    | 显示页码跳转输入框：回车或失焦提交，越界夹到首尾页，非法输入不提交 |
| `size`          | `'small' \| 'middle' \| 'large'` | `'middle'` | 尺寸变体                                                           |

### Events

| 事件                | 参数              | 说明                       |
| ------------------- | ----------------- | -------------------------- |
| `update:modelValue` | `(value: number)` | 页码变化后触发，含程序写入 |

## 页码窗口规则

窗口展开成一条序列，规则全部在 primitives 层可单测：

- **全展开**：总页数 ≤ `boundaryCount×2 + siblingCount×2 + 3` 时直接列出全部页码，永远不出现省略号。
- **省略号**：与固定首尾之间缺 ≥2 页时折叠成省略号；**只缺 1 页时直接补上那一页**——「1 … 3」比「1 2 3」多一个无意义的符号。
- **当前页钳制**：`v-model` 越界或非法时读出的页码始终落在 `[1, pageCount]`，窗口不会画出页。
- **翻页**：第 1 页时「上一页」禁用而不是绕到末页——分页是位置导航，不是轮播。

```
1 … 4 5 [6] 7 8 … 20      siblingCount=2, boundaryCount=1
```

## 页码跳转

`showJumper` 在页码带末尾追加一个跳转输入框，规则都在无头层的 `setValue` 上，本层只负责收集输入：

- **提交时机**：只有 Enter 与 blur。输入到一半就跳页会把「正在输入」当成「已经确认」。
- **越界**：交给 `clampPaginationPage` 夹进 `[1, pageCount]`，输 `99` 到 10 页就是第 10 页，与直接点末页同一条路径。
- **非法**：空值与非数字不提交，也不悄悄改成第 1 页——那会让人以为键入没生效。
- **提交后清空**：输入框回到占位状态，不留一个可能与实际页码不一致的数字。
- **禁用**：整条禁用时输入框 `disabled`，程序写入同样被吞掉。

```vue
<Pagination v-model="page" :total="100" show-jumper />
```

## 无样式层用法

七个复合部件都在 `@agile-plus/ui/pagination`，**页码项由消费者自己 `v-for`**——Root 通过默认插槽把 `items` / `pageCount` / `currentPage` 交出来，你需要哪个页码、放什么内容完全自定义：

```vue
<script setup lang="ts">
import { ref } from 'vue';

import {
  PaginationEllipsis,
  PaginationJumper,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrev,
  PaginationRoot,
} from '@agile-plus/ui/pagination';

const page = ref(1);
</script>

<template>
  <PaginationRoot v-model="page" :total="100">
    <template #default="{ items }">
      <PaginationList>
        <PaginationPrev />

        <template v-for="item in items" :key="item.key">
          <PaginationPage v-if="item.type === 'page'" :page="item.page" />
          <PaginationEllipsis v-else :side="item.side" />
        </template>

        <PaginationNext />

        <PaginationJumper />
      </PaginationList>
    </template>
  </PaginationRoot>
</template>
```

Root 的默认插槽只放一个 `PaginationList`：部件渲染成 `li`，而 `li` 的直接父级必须是列表元素，挂在 `nav` 下是无效标记，宿主文档按兄弟规则排版时还会让翻页件和页码错开基线。

| 部件                 | 渲染               | 说明                                                         |
| -------------------- | ------------------ | ------------------------------------------------------------ |
| `PaginationRoot`     | `nav`              | 状态宿主；默认插槽暴露 `items` / `pageCount` / `currentPage` |
| `PaginationList`     | `ul`               | 纯结构容器，不注入上下文，脱离 Root 也不会抛错               |
| `PaginationPage`     | `li > button`      | 页码即按钮文本也即点击目标，必填 `page`                      |
| `PaginationEllipsis` | `li > span`        | 不可交互，`aria-hidden`；`side` 只服务样式                   |
| `PaginationPrev`     | `li > button`      | `label` 缺省 `'上一页'`；样式层换成箭头后可访问名仍来自它    |
| `PaginationNext`     | `li > button`      | `label` 缺省 `'下一页'`                                      |
| `PaginationJumper`   | `li > div > input` | 页码跳转；`label` / `suffix` / `ariaLabel` 三段文案可换      |

带样式的 `Pagination` 内部替你完成了这段 `v-for`（并把文字翻页按钮换成箭头图形）；需要完全自定义布局时绕过它自行装配即可。

## 无障碍行为

| 项         | 说明                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| 地标       | 根元素是 `<nav aria-label>`，屏幕阅读器可以一次跳到「分页」                                                                |
| 当前页     | 当前页码按钮输出 `aria-current="page"`，而不是靠 `data-state` 表达                                                         |
| 省略号     | `span` 且 `aria-hidden`：空档已由页码间距表达，朗读出一个「点」只会打断序列                                                |
| 翻页按钮   | 带 `aria-label`；在边界端输出 `disabled`                                                                                   |
| 跳转输入框 | 原生 `<input type="number">`，带 `min` / `max` 与独立 `aria-label`；两侧提示文字 `aria-hidden`，避免被读成「跳至 页码 页」 |
| 焦点       | 原生 Tab 顺序，不做 roving tabindex：页码数量可变，移动焦点反而干扰阅读顺序                                                |
| 禁用       | 整条禁用下所有按钮与跳转输入框 `disabled`，`setValue` / `step` 的程序写入同样被吞掉                                        |

## 样式钩子

```text
.y-pagination                                根（nav）
.y-pagination--small / --middle / --large    尺寸变体
[data-part='list']                           页码窗口容器（ul）
[data-part='item']                           页码项（li）
[data-part='page']                           页码按钮
[data-part='page'][data-state='active']      当前页
[data-part='ellipsis'][data-side]            省略号
[data-part='previous'] / [data-part='next']  前后翻页按钮
[data-part='jumper']                         页码跳转外壳
[data-part='jumper-label'] / -suffix         跳转框两侧提示文字
[data-part='jumper-input']                   跳转输入框
[data-disabled]                              禁用项
```

部件内部的 `data-part` 与 `data-state` / `data-disabled` 来自 primitives 的属性表，样式层与自动化测试读的是同一份状态。组件级变量：`--y-pagination-color`、`--y-pagination-hover-color`、`--y-pagination-active-color`、`--y-pagination-on-color`、`--y-pagination-text`、`--y-pagination-text-secondary`、`--y-pagination-border`、`--y-pagination-hover-bg`、`--y-pagination-active-bg`、`--y-pagination-disabled-*`、`--y-pagination-radius`、`--y-pagination-gap`、`--y-pagination-item-size`。

## Headless 层

```ts
import { usePagination } from '@agile-plus/headless/usePagination';

const pagination = usePagination({ total: () => props.total, pageSize: 10 });

pagination.items.value; // [{ type: 'page', page: 1, key: 'page-1' }, …]
pagination.pageCount.value; // 10
pagination.currentPage.value; // 永远落在 [1, pageCount]
pagination.disabled.value; // 整条禁用，供非按钮部件（跳转输入框）直接读
pagination.setValue(3);
pagination.step('next');
pagination.getPageProps(2); // { 'aria-current': undefined, 'data-state': 'inactive', … }
```

`modelValue` / `defaultValue` / `onValueChange` 走可控/非受控协议（`useControllable`），`undefined` 是唯一非受控判据；`total` 等几何参数接收 `MaybeRefOrGetter`，搜索结果变化时窗口自动重算。

## Primitives 层

```ts
import {
  clampPaginationPage,
  getPaginationItems,
  getPaginationPageAttrs,
  getPaginationStepAttrs,
  resolvePaginationPageCount,
} from '@agile-plus/primitives/pagination';

resolvePaginationPageCount({ total: 95, pageSize: 10 }); // 10
clampPaginationPage(99, 10); // 10
clampPaginationPage(NaN, 10); // 1

getPaginationItems({ total: 100, pageSize: 10, current: 1 });
// [1, 2, 3, 4, { type: 'ellipsis', side: 'end' }, 10]

getPaginationPageAttrs(2, { pageCount: 10, current: 2 });
// { 'aria-current': 'page', 'data-state': 'active' }

getPaginationStepAttrs('previous', { pageCount: 10, current: 1 });
// { disabled: true, 'data-disabled': '' }
```

类型 `PaginationItem` / `PaginationConfig` / `PaginationDirection` / `PaginationEllipsisSide` 同样从 `@agile-plus/primitives/pagination` 导出。
