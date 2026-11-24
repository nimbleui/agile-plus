<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import VirtualTreeDemo from '../.vitepress/components/VirtualTreeDemo.vue';
</script>

# VirtualTree 虚拟树形控件

十万级节点的树，DOM 里只有视口内那十几行：展开收起、单选多选、父子级联勾选与半选、完整键盘导航与 WAI-ARIA Tree View 语义。四层实现：`primitives/tree` 负责树索引、可见行压平、级联三态与键盘意图；`headless/useVirtualTree` 负责四条状态通道与滚动测量；`ui/virtual-tree` 提供 viewport / content / row 三层结构、ARIA 与功能性内联样式；`components/virtual-tree` 注入缩进、箭头、勾选框与状态底色。

**树虚拟化的全部秘密在于：它不需要第二套虚拟化算法。** 折叠的分支在压平阶段就不产生行，剩下的事情与虚拟列表完全一致——窗口、前缀和、动态高度测量、滚动补偿一律复用 `useVirtualList`。窗口只认当前位置，树通过 `row.key` 把节点身份交给高度缓存与 DOM key。

## 基础示例

<Preview description="实时演练场（节点规模 / 内容形态 / 选中模式 / 级联勾选 / 预估行高 / 预渲染行数 / 容器高度 / 定位到键 / 替换 / 重量高度全部即时生效）、级联半选与禁用墙（无样式层直读 checkStates）、三格插槽整体替换。">
  <VirtualTreeDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { VirtualTree } from '@agile-plus/components/virtual-tree';

import type { TreeKey } from '@agile-plus/components/virtual-tree';

const data = [
  { key: 'orders', label: '订单中心', children: [{ key: 'orders.read', label: '查看订单' }] },
];

const expandedKeys = ref<TreeKey[]>(['orders']);
const checkedKeys = ref<TreeKey[]>([]);
</script>

<template>
  <VirtualTree
    v-model:expanded-keys="expandedKeys"
    v-model:checked-keys="checkedKeys"
    :data="data"
    :height="320"
    checkable
  />
</template>
```

## 成品层 Props

| 属性                  | 类型                               | 默认值      | 说明                                                              |
| --------------------- | ---------------------------------- | ----------- | ----------------------------------------------------------------- |
| `data`                | `readonly TreeDataNode[]`          | `[]`        | 节点树；默认按 `key` / `children` / `disabled` / `isLeaf` 读字段  |
| `fields`              | `TreeFieldNames`                   | `undefined` | 字段名映射，只接受字段名**字符串**                                |
| `selection`           | `'none' \| 'single' \| 'multiple'` | `'single'`  | 选中模式；`none` 时行点击不改选中态也不输出 `aria-selected`       |
| `checkable`           | `boolean`                          | `false`     | 父子级联勾选                                                      |
| `expandedKeys`        | `readonly TreeKey[]`               | `undefined` | 受控展开键，配 `v-model:expanded-keys`                            |
| `defaultExpandedKeys` | `readonly TreeKey[]`               | `[]`        | 非受控初始展开键                                                  |
| `selectedKeys`        | `readonly TreeKey[]`               | `undefined` | 受控选中键，配 `v-model:selected-keys`                            |
| `defaultSelectedKeys` | `readonly TreeKey[]`               | `[]`        | 非受控初始选中键                                                  |
| `checkedKeys`         | `readonly TreeKey[]`               | `undefined` | 受控勾选键，配 `v-model:checked-keys`；语义是级联后的**最小集合** |
| `defaultCheckedKeys`  | `readonly TreeKey[]`               | `[]`        | 非受控初始勾选键                                                  |
| `activeKey`           | `TreeKey \| null`                  | `undefined` | 受控活动键（键盘游标所在行），配 `v-model:active-key`             |
| `height`              | `string \| number`                 | `undefined` | 滚动容器高度；数字按 `px`，字符串原样写入，不传则由外层决定       |
| `estimateSize`        | `number`                           | `40`        | 未测量行的预估高度，同时决定滚动条长度                            |
| `overscan`            | `number`                           | `3`         | 视口上下各预渲染的行数；显式 `0` 表示关闭预渲染                   |

四个受控 prop 的缺省都是 `undefined` 而不是空数组——把「没传」写成「传了空集合」会让组件进入「受控且恒为空」的状态，非受控用法静默失效。这是本库所有受控属性的统一约束。

`data` 与三个插槽的 `row/node` 保留节点泛型 `T`。消费者可以直接传 `interface Node { key: string; label: string; children?: Node[] }`，不需要额外索引签名，插槽里的 `node.label` 也保持 `string` 类型。

**插槽**（三个格子都有默认形状，都能整体替换内容）：

| 插槽       | 作用域参数                | 出现条件                |
| ---------- | ------------------------- | ----------------------- |
| `default`  | `{ row, node, selected }` | 每一行                  |
| `toggle`   | `{ row, expanded }`       | 只有分支行              |
| `checkbox` | `{ row, state }`          | 只有 `checkable` 为真时 |

`node` 与 `row.node` 是同一份引用，给平铺入口是因为低代码物料里的绑定路径写不到嵌套表达式。默认标签格只读 `label` 字段：`fields` 里没有标签字段这一项，标签的画法属于插槽而不是配置。

**事件**：`update:expandedKeys` / `update:selectedKeys` / `update:checkedKeys` / `update:activeKey`。没有 `select` / `check` / `expand` 这类语义事件——它们的信息量完全等于对应通道的值，多一套事件只多一套可能不同步的真源。

**成品层 expose**：`expandAll()`、`collapseAll()`、`clearSelection()`、`scrollToKey(key)`、`invalidateMeasurements()`。

判据只有一条：**非受控用法下消费者自己做不到**。展开、选中、勾选、活动四条通道都能用 `v-model` 直接写，所以 `expand` / `collapse` / `selectRow` / `setActiveKey` / `toggleCheck` 不在这里重复；`expandAll` 需要全部节点键，`clearSelection` 在单选模式下点已选行不会取消，`scrollToKey` 与 `invalidateMeasurements` 根本没有对应 prop。区间状态（`scrollTop` / `totalSize`）与三态表也不从这里读，见下文「无样式层与无头层」。

## 可见行是树与虚拟列表之间的唯一接口

`primitives/tree` 的 `flattenTreeRows(index, expandedKeys)` 把树按展开状态压成一个普通数组，复杂度 **O(可见行数)**：

- **折叠的分支不下探**，所以全折叠的十万级树只产出顶层那几行。这也是本函数不能改写成「先一次性扁平化全表再过滤」的原因——那样每一步都要付出全部节点的代价。
- 产出的 `row.index` 就是数组下标，也就是虚拟列表的项下标；`rows.length` 直接充当 `useVirtualList` 的 `count`。**看不见的节点根本不参与测量**，动态高度那一套（Fenwick 前缀和、padding 定位、rAF 合帧、滚动补偿）原样复用，见 [VirtualList 虚拟列表](/components/virtual-list)。
- 高度按 `row.key` 缓存，行的 `:key` 也使用 `row.key`。展开收起只重排当前可见行，同一节点的实测高度与 DOM 状态不会转移到另一个节点；活动、展开、选中、勾选同样一律存 key。
- 按键查下标（`findTreeRowIndex`）是线性扫描而不是常驻一张 Map：调用点是方向键与 `scrollToKey` 这类用户动作，一次 O(可见行) 已经够了；常驻映射则是每次展开收起都要重建的第二份真源。
- 树索引 `buildTreeIndex` 是 O(全部节点)，只在 `data` **引用**变化时重建；键不变则三条状态通道原样保留。就地改数组不会触发重建，需要时传新数组。

## 勾选级联的四条语义规则

`checkedKeys` 是唯一的显式真源，其余状态都从它推出来。四条规则就是这个 prop 的完整定义：

1. **在集合里就是选中。** 父节点的键进了集合就表示它整棵子树被点亮——这让「全选」可以用几个顶层键表达，而不是枚举十万个叶子键。
2. **不在集合里的分支由后代汇总。** 可参与的子节点全选中 → 选中；一部分选中或半选 → 半选；其余 → 未选中。于是服务端只回传叶子键时，父节点自动长成半选，不需要额外字段。
3. **禁用节点是一堵墙**，四个方向都成立：不被祖先下传点亮、不向下传递、不参与父节点汇总，但自己显式在集合里时仍然显示选中。不参与汇总的理由与 Table 的全选框同源——否则一个永远勾不上的子节点会把父节点永久拖在半选，用户点多少次全选都到不了 checked。
4. **一棵子树里所有子节点都被禁用时，父节点判为未选中而不是半选。** 半选必须是「用户做得到却只做了一半」，否则它成了无法消除的视觉噪声。后果是这个父节点即使带着已勾选的禁用子节点也显示未勾选——与 Table 的全选框同一取舍：宁可少显示一层，也不给使用者一个点不动的状态。

点击一个分支时，`toggleTreeCheckedKeys` 会先摘掉整棵子树与**所有祖先**的键，再写入自身与非禁用后代。摘祖先不是可选优化：集合里留着一个选中祖先的键，规则 1 会把整棵子树重新点亮，取消操作随即失效——这是「显式集合 + 下传」这套语义唯一的坑。

产出的集合满足**回读一致性**：把它交给 `resolveTreeCheckStates` 得到完全相同的状态表。所以受控用法把事件结果原样回传不会抖动，存下来下次再传也不会变形。

由此得到两条使用口径：

- **半选永远不在 `checkedKeys` 里**，因为它是派生结论而不是用户显式做出的决定。要拿到「半选了哪些」，用 `ui` 层 expose 的 `checkStates`（键到三态的全量映射），或 `primitives` 的 `collectTreeKeysByState(index, states, 'indeterminate')`。
- **提交给服务端时按需选一侧**：只要叶子就筛 `branch === false` 的选中键，要「整棵子树」这个语义就把半选与选中一起按层级送上去。组件不替你决定，因为两种后端契约都真实存在。

## 选中与勾选是两条正交的通道

`selection` 表达「当前行」——单选高亮，落在 `aria-selected` 与 `aria-multiselectable` 上；`checkable` 表达「勾了哪些」——多选带半选，落在 `aria-checked` 上。文件浏览器只要前者，权限树只要后者。合并成一个开关就会让其中一类场景出现一个没有语义的控件，因此两者各持一份键集合、互不干涉。

一次按键只操作一条通道：**Enter 选中当前行；Space 在 `checkable=true` 时切换勾选，否则选中当前行**。这样选中与勾选可以分别用键盘表达，不需要一次按键同时改两份状态。

## 键盘导航

整棵树只有一个 tab 停靠点（`role="tree"` 的 content 元素），进入之后用方向键在行之间移动，真实焦点始终留在容器上。

| 按键             | 行为                                                                    |
| ---------------- | ----------------------------------------------------------------------- |
| `↑` / `↓`        | 上/下一个**未禁用**行；到端点不回绕；首次进入时按键方向决定从哪端起步   |
| `→`              | 收起的分支 → 展开它；展开的分支 → 进入第一个未禁用子节点；叶子 → 无操作 |
| `←`              | 展开的分支 → 收起它；其余 → 回到父行；顶层或父行被禁用 → 无操作         |
| `Home` / `End`   | 第一个 / 最后一个未禁用行                                               |
| `Enter`          | 选中当前行                                                              |
| `空格`           | 勾选模式下切换勾选，否则选中当前行                                      |
| `Tab` / `Escape` | 交还浏览器                                                              |
| 带 Ctrl/Alt/Meta | 一律交还浏览器（Ctrl+Home 应当滚文档，不是跳到首行）                    |

三条取舍值得说明：

- **「进入子节点」用 `parentIndex` 判定而不是「取下一行」**：子节点全部禁用时取下一行会跑出这棵子树，把焦点送到一个与按键无关的位置。
- **不做循环**：树不是菜单，在长列表末尾按向下却跳回顶部会让人丢失位置感。
- **Shift 不算修饰键**：本组件没有范围选择，Shift+方向键与方向键同义，拦下它反而会打断用户在输入类容器里的 Shift 组合。首字母 typeahead 同样没做——它需要的输入缓冲与匹配规则是一份独立能力。

## 无障碍行为

| 项         | 说明                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 结构       | content 是 `role="tree"` 且带 `tabindex="0"`；行是 `role="treeitem"` 平铺，**没有嵌套 `role="group"`**                                                                         |
| 命名       | 宿主传入的 `aria-*` 转发到 content；`class` / `style` 等透传属性仍落在 viewport                                                                                                |
| 为什么平铺 | 虚拟化之后未渲染的子树不在 DOM 里，嵌套 group 会把它们整段挡在无障碍树之外；层级改由下面三个属性表达                                                                           |
| 层级       | 每行 `aria-level`（深度 + 1）、`aria-posinset`、`aria-setsize`；**折叠与窗口外的兄弟计入 `setsize`**，这是它的定义，也是只渲染十几行时仍能报「第 3 项，共 12 项」的原因        |
| 焦点       | `aria-activedescendant` 挂在 content 上，与 `role` / `tabindex` 同一个元素；活动行滚出渲染窗口时**撤掉**该属性——指向一个不存在的 id 会让读屏报「未命名」而不是「这行滚出去了」 |
| 展开       | 叶子不输出 `aria-expanded`：输出 `false` 会被念成「可收起」，而它压根没有箭头                                                                                                  |
| 选中       | `selection="none"` 时不输出 `aria-selected`                                                                                                                                    |
| 勾选       | `aria-checked` 三态：`true` / `false` / `mixed`；半选只有 `mixed` 一种正确表达                                                                                                 |
| 装饰       | 箭头与勾选框两个包裹格带 `aria-hidden="true"` 且不可聚焦，状态已经写在行上；读屏不需要再念一次装饰                                                                             |
| 禁用       | `aria-disabled` + `data-disabled`；点击与键盘都跳过它，它也不会成为活动行                                                                                                      |
| 样式钩子   | `data-expanded` / `data-selected` / `data-check-state` / `data-active` / `data-disabled` / `--y-tree-level`                                                                    |
| 减少动效   | 箭头旋转与行底色过渡在 `prefers-reduced-motion` 下关闭，展开状态仍靠底色与旋转后的箭头之外的文本可辨                                                                           |

`data-active` 是必要项而不是锦上添花：单一 tab 停靠点的设计里 `:focus` 永远落在容器上，行自身不会聚焦，键盘游标若只写在 `aria-activedescendant` 里就画不出来。

## 无样式层与无头层

`ui/virtual-tree` 是同一套结构去掉 CSS 的样子：Props 与事件完全一致，行外观与三格内容全部由插槽给出。它的 expose 比成品层宽得多——`rows` / `visibleRows` / 四条键通道 / `checkStates` / `activeKey` / `totalSize` / `scrollTop` / `viewportSize`，以及 `expand` / `collapse` / `toggleExpand` / `expandAll` / `collapseAll` / `selectRow` / `clearSelection` / `toggleCheck` / `setActiveKey` / `scrollToKey` / `invalidateMeasurements`。

`headless/useVirtualTree` 把两件事接在一起：树侧的状态与导航，虚拟侧的测量与区间。

```ts
import { useVirtualTree } from '@agile-plus/headless';

const tree = useVirtualTree({
  data: () => nodes.value,
  estimateSize: 40,
  overscan: 3,
  onCheckedKeysChange: (keys) => submit(keys),
});
```

调用方需要绑四样东西：`getRootAttrs()` 与 `onKeydown` 给 `role="tree"` 那层，`getItemAttrs(row)` 给每一行，`paddingTop` / `paddingBottom` 给内容层，`setViewportElement` / `setContentElement` 用 `:ref` 绑两个元素。

契约只有一条：**content 必须是行的直接父元素**。`aria-level` / `aria-posinset` / `aria-setsize` 组成的层级只有在扁平的 treeitem 序列上才成立，而上下 padding 也正是在这一层承载总高的；中间插一层包装元素会同时破坏无障碍语义和高度记账。

## 样式层：缩进对齐与状态钩子

组件级变量里有一条等式不是随手写的：

```scss
'indent': calc(var(--y-virtual-tree-toggle-size) + var(--y-virtual-tree-gap)),
```

分支行的标签在箭头右侧，落点是 `indent × level + 箭头宽 + 间距`；叶子行没有箭头，落点是 `indent × level`。只有 `indent = toggle-size + gap` 时父行与它的叶子子节点才落在同一条竖线上——两个值分开写，对齐就成了碰运气。勾选框在两种行里都出现，等式两边同时多出一份，不影响结论。

另外三条约束：

- **变量表里没有「行高」这一项。** 动态高度虚拟列表的前提是行有多高量出来就是多高，样式写死 `height` / `min-height` 会让 `estimateSize` 与实测长期不符，滚动条长度与跳转落点一起失真。树比列表更需要这一条——缩进、箭头、换行的标签都在改变行的高度。
- **状态一律走 `data-*` 钩子，不用结构选择器。** 窗口化渲染里 DOM 只有当前那十几行，`:last-child` / `:nth-child()` 会随滚动翻面。
- **焦点环画在 viewport 上而不是 content 上。** content 盒子带着上下 padding，高度等于整棵树的总高而不是可见区域；环画在它身上，滚动之后就落在视口外，等于没有环。

行底色按「越持久越优先」组织：hover 只作用于未选中、非活动行，`data-active` 与 `data-selected` 独立覆盖，因此鼠标划过已选行时仍保持选中色。

## 数据变更与高度记账

- **换一份 `data` 引用**：索引重建，键不变则展开 / 选中 / 勾选 / 活动四条通道原样保留，实测高度也按 key 保留。
- **整批替换、重排或改排序规则**：稳定 key 的高度自动跟随新位置；不需要为了重排调用 `invalidateMeasurements()`。该动作只用于强制丢弃全部真实测量。
- **展开与收起**：只改变当前可见行顺序，虚拟化按 key 重映射高度并重算总高，不需要手动干预。折叠后离开当前集合的测量会释放，再次展开时重新收敛。
- **行内本地状态跟随 key**：同一个节点在展开收起后保留自己的 DOM；数据 key 改变时视为新节点。
- **缺省 key 与显式 key 碰撞会明确报错**：例如 `[{}, { key: '0' }]`，避免静默丢掉第二个节点或子树。重复的显式 key 仍保留第一次出现。

## 已知限制

- **不做异步加载（lazy）**：`isLeaf` 字段与 `TreeFieldNames.leaf` 已经留好扩展点——「还没有子节点」与「没有子节点」在这一层是可区分的，接 lazy 不需要改 API，但本期没有加载钩子。
- **不做首字母 typeahead、范围选择、拖拽移动节点、连线 guideline、`checkStrictly`（父子不级联的独立勾选模式）**：都是独立能力，不在本期口径里。
- **成品层不暴露区间状态与三态表**：需要「滚到底加载更多」或「半选了哪些」，请用 `ui` 层组件或直接绑 `useVirtualTree`。
- **纵向、元素内滚动、容器高度必须确定**：与 VirtualList 同一组限制。`viewportSize` 还没量到时算出的是「首项 + 前后 overscan」，不会崩，但也不覆盖视口。
- **`fields` 只接受字段名字符串**：本库组件要进低代码画布，props 必须可 JSON 序列化，取值函数进不了 schema。代价是不能表达「键由多个字段拼出」，那种节点请在数据侧预处理；标签字段不在这里配置，走默认插槽。
- **`expandAll` 在十万级树上是 O(全部节点) 的一次写入**：一次写完而不是逐行调用，避免每次展开都重排一次行序列；但它仍然会把全部键写进展开集合并让行序列整体重排，请把「展开全部」用在有限规模的树上。演练场把「展开全部 / 收起全部 / 替换全部」到 DOM 更新完成的总耗时打在按钮下方——那一段路要走完索引重建、展平、测量与渲染，所以它比任何单步都大，但也只有它是本页真实量出来的数字。
- **尚未登记进低代码物料表**：与 Table / Splitter 同一口径（数组类属性在物料面板里还按文本框处理），登记与文档页、Demo 一起排在其后批次。
