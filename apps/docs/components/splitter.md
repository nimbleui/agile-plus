<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import SplitterDemo from '../.vitepress/components/SplitterDemo.vue';
</script>

# Splitter 分隔面板

把容器切成若干可拖拽的面板。属性名对齐 antd React 的 `Splitter` / `Splitter.Panel`：`layout`、`barSize`、`lazy`、`size` / `defaultSize` / `min` / `max` / `collapsible` / `resizable`，事件是 `resize-start` / `resize` / `resize-end` / `collapse` / `dragger-double-click`。

与 `Table` 的 `resizable` 不是一回事：那张表拖的是列模型里的某一层表头手柄，尺寸由列宽覆盖态记账；`Splitter` 拖的是任意两块内容之间的分隔条，尺寸真源在组件自己手里。

## 基础示例

<Preview description="横向分割、百分比与折叠箭头、垂直分割、lazy、禁用与不可拖动、受控尺寸六组。每组下方标注当前像素读数。">
  <SplitterDemo />
</Preview>

```vue
<script setup lang="ts">
import { Splitter, SplitterPanel } from '@agile-plus/components/splitter';
</script>

<template>
  <Splitter style="height: 320px" @resize="console.log">
    <SplitterPanel :default-size="240" :min="120" :max="420">左侧</SplitterPanel>
    <SplitterPanel>自适应</SplitterPanel>
    <SplitterPanel default-size="25%" :collapsible="{ start: true }">右侧</SplitterPanel>
  </Splitter>
</template>
```

分隔条不用写：每个面板自动在自己与后一个面板之间画一条，最后一个面板后面不会多出空 bar。三栏加两个折叠入口的骨架因此只有四行，也不会出现「写了 bar 却忘了配下一个面板」的错位。

## Splitter

### Props

| 属性         | 类型                         | 默认值         | 说明                                                     |
| ------------ | ---------------------------- | -------------- | -------------------------------------------------------- |
| `layout`     | `'horizontal' \| 'vertical'` | `'horizontal'` | 面板排列方向；分隔条的 `aria-orientation` 是它的垂直方向 |
| `dir`        | `'ltr' \| 'rtl'`             | `'ltr'`        | 文本方向，决定横向拖拽与方向键的正方向                   |
| `barSize`    | `number`                     | `8`            | 单条分隔条在排列方向上占的像素，参与可用空间扣减         |
| `resizeStep` | `number`                     | `10`           | 方向键一次移动的像素，`Shift` 时乘 5                     |
| `lazy`       | `boolean`                    | `false`        | 拖拽期间只平移分隔条，抬起才落地尺寸                     |
| `disabled`   | `boolean`                    | `false`        | 整组禁用，关掉所有分隔条的拖拽与折叠入口                 |
| `as`         | `string`                     | `'div'`        | 渲染的目标标签名                                         |

成品层的根没有 `asChild`：它要同时渲染容器与内部结构，`asChild` 属于 UI 层 `SplitterRoot` 的自由度。

### Events

| 事件                   | 负载                                      | 触发时机                                                         |
| ---------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| `resize-start`         | `sizes: number[]`                         | 分隔条按下，负载是拖起前的快照                                   |
| `resize`               | `sizes: number[]`                         | 尺寸变化；非 `lazy` 拖拽逐帧触发，`lazy`、键盘与双击在落地时一次 |
| `resize-end`           | `sizes: number[]`                         | 一次拖拽正常抬起；被系统中断（`pointercancel`）时不触发          |
| `collapse`             | `collapsed: boolean[]`, `sizes: number[]` | 折叠态翻转，布尔数组与面板等长                                   |
| `dragger-double-click` | `index: number`                           | 双击分隔条，负载是该分隔条下标                                   |

负载一律是像素数组，顺序与面板在 DOM 里的顺序一致。作者写的是 `default-size="25%"`，读回来的永远是当下真实宽度——这与 antd 的 `onResize(sizes: number[])` 同形，不需要使用方自己换算百分比。

`dragger-double-click` 在可用性判定之前发出：整组禁用时事件仍然上报，只是不做复位。回调因此可以兼作「用户想复位」的信号，不必先自己判断这一条能不能拖。

## SplitterPanel

### Props

| 属性          | 类型                                  | 默认值      | 说明                                                                 |
| ------------- | ------------------------------------- | ----------- | -------------------------------------------------------------------- |
| `size`        | `number \| string`                    | `undefined` | 受控尺寸（`v-model:size`），数字是像素、`'30%'` 是百分比、不写自适应 |
| `defaultSize` | `number \| string`                    | `undefined` | 非受控初值，形状同 `size`                                            |
| `min`         | `number \| string`                    | `undefined` | 最小尺寸，缺省 0                                                     |
| `max`         | `number \| string`                    | `undefined` | 最大尺寸，缺省不限                                                   |
| `resizable`   | `boolean`                             | `true`      | 是否可拖拽与键盘调整；`false` 时分隔条仍在、折叠箭头仍可用           |
| `disabled`    | `boolean`                             | `false`     | 面板级禁用，同时关掉它的拖拽与折叠入口                               |
| `collapsible` | `boolean \| { start, end, showIcon }` | `undefined` | 折叠能力：`true` 两边都可折叠，对象写法逐边开关并控制箭头是否常驻    |
| `as`          | `string`                              | `'div'`     | 渲染的目标标签名                                                     |

面板同样没有 `asChild`：它要渲染自己加上后面那条分隔条，本来就是多根片段，再折叠成单个子元素会让「属性落到哪一层」失去唯一答案。

`min` / `max` / `size` 的百分比相对的是**可用空间**（容器尺寸扣掉全部分隔条占位），不是容器宽度。`size` 的缺省必须是 `undefined`——它是「未受控」的唯一判据，写成 `null` 或 `''` 会被当作合法的「自适应」值。

### Slots

| 插槽      | 作用域参数                   | 说明                                   |
| --------- | ---------------------------- | -------------------------------------- |
| `default` | `index`、`size`、`collapsed` | 面板内容；`size` 未测得容器时为 `null` |

作用域参数是给面板头部用的：`collapsed` 决定要不要显示「已收起」标记，`size` 可以直接读出当前像素宽度。

## 尺寸怎么算

一次解析只有三步，全部在 `primitives` 的纯函数里：

```text
可用空间 available = round(容器在排列方向上的 client 尺寸) − barSize × (面板数 − 1)

第一轮  有单位的面板（number / '30%'）按声明解析成像素，并钳到自己的 [min, max]
第二轮  余量在自适应面板之间等分，每个仍受自己的 [min, max] 约束
第三轮  还有余量就加给未触顶的自适应面板；没有自适应面板时留白（不撑破定宽承诺）
```

三条约束决定了这套算法的形状：

- **作者是意图，像素是工作值**。拖拽、折叠、键盘都把自己的单位改写成像素，容器尺寸变化时再由这些单位重新解析：定宽面板不动、`%` 面板按比例跟随、自适应面板吸收余量。
- **折叠优先于 `min`**。一个 `min: 200` 的面板仍要收得起来，因此折叠面板的最小尺寸临时视为 0；反过来「是否处于折叠态」只看作者单位是否解析为 0，不看解析结果——用像素判定的话，`min` 要为折叠放宽而 `min` 又参与像素解析，判定会自引用。
- **拖拽以按下时的快照为基准算绝对位移**。逐帧累加会把被 `max` 钳制掉的位移丢掉，指针回撤时分隔条跟不上手。

折叠让出的像素给这条边外侧的邻居，邻居吸不完时剩余量给另一侧，两边都吸不完就留成空白——把余量硬塞给更远的面板会让一次点击牵动整组尺寸。让出的像素与被谁吸收记进还原凭据，展开时原路要回；没有凭据时（作者直接把 `size` 写成 `0`）退回自适应单位，而不是凭空造一个「默认宽度」。

## 键盘与可访问性

分隔条是 `role="separator"` 且带 `tabindex="0"` 的焦点停靠点，可拖动的每一条都占一个 Tab 位。

只接管与排列轴同向的按键：纵向分隔条上按左右键不改变任何东西，与其静默吞掉按键，不如交还给页面滚动。

| 按键                       | 横向（`ltr`）                 | 纵向                          |
| -------------------------- | ----------------------------- | ----------------------------- |
| `ArrowRight` / `ArrowDown` | 分隔条沿正方向移 `resizeStep` | 分隔条沿正方向移 `resizeStep` |
| `ArrowLeft` / `ArrowUp`    | 分隔条沿反方向移 `resizeStep` | 分隔条沿反方向移 `resizeStep` |
| 另一轴的两枚方向键         | 不接管，页面照常滚动          | 不接管，页面照常滚动          |
| `Shift` + 正方向键         | 位移 × 5                      | 位移 × 5                      |
| `Home`                     | 左侧面板收到自己的 `min`      | 上方面板收到自己的 `min`      |
| `End`                      | 左侧面板撑到自己的 `max`      | 上方面板撑到自己的 `max`      |
| `dblclick`                 | 复位这条 bar 两侧的面板       | 同左                          |

`dir="rtl"` 时横向的正方向整体取反，`ArrowRight` 变成收、`ArrowLeft` 变成放。`Home` / `End` 用无穷位移实现，因此不必为「`max` 未设」特判：约束解析自己会停在「可用空间减去邻居 `min`」的位置。

| 项       | 实现                                                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 取值语义 | `aria-valuemin` / `aria-valuenow` / `aria-valuemax` 取自**前一个面板**的尺寸与约束                                                                                                                                 |
| 名字     | `aria-label="第 N 条分隔条"`，否则读屏只念得出 role 而不知道动的是什么                                                                                                                                             |
| 方向     | `aria-orientation` 报的是分隔条自身的朝向：横向排列（左右分栏）的缝是竖线 → `vertical`，纵向排列 → `horizontal`，与 `layout` 互相垂直（APG 按键表同一口径：「Left Arrow: Moves a vertical splitter to the left」） |
| 不可用   | `aria-disabled="true"` 且退出 Tab 序，分隔条保留但不响应指针与键盘                                                                                                                                                 |
| 折叠按钮 | 真 `<button>` 带 `aria-label="收起面板 / 展开面板"`，`tabindex="-1"`：指针用户有真按钮，键盘用户用分隔条的方向键，不多占停靠点                                                                                     |
| 拖拽中   | 根与当前分隔条带 `data-resizing`，样式据此高亮；`touch-action: none` 保证触摸端指针跟手前不先把页面滚走                                                                                                            |

## 无样式层用法

```vue
<script setup lang="ts">
import { SplitterBar, SplitterPanel, SplitterRoot } from '@agile-plus/ui/splitter';
</script>

<template>
  <SplitterRoot :bar-size="12" class="my-splitter">
    <SplitterPanel :default-size="240" class="my-pane">左侧</SplitterPanel>
    <SplitterPanel class="my-pane">自适应</SplitterPanel>
  </SplitterRoot>
</template>
```

UI 层同样由面板自动带出后面的分隔条。要换分隔条的内部结构时（放自定义图标、加 tooltip），显式写 `<SplitterBar :bar-id="…">` 并用它的作用域插槽 `controls` 自己渲染按钮：`barId` 是该 bar **前一个面板**的 id，因此手写 bar 需要自己持有面板的 `useId()`——这条路径存在但不常用，默认结构够用。

`SplitterRoot` 有 `asChild`，`SplitterPanel` 没有（理由同成品层）。

## useSplitter

```ts
import { useSplitter, useSplitterPanel } from '@agile-plus/headless';

const splitter = useSplitter({ layout: 'horizontal', barSize: 8 });
```

| 返回值                                                                      | 说明                                                        |
| --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `sizes` / `collapsedFlags`                                                  | 当前像素数组与折叠布尔数组，顺序即 DOM 顺序                 |
| `measured` / `panelCount` / `layout` / `barSize` …                          | 配置与容器状态的响应式读数                                  |
| `registerPanel(entry)`                                                      | 面板登记入口，返回注销函数                                  |
| `setRootElement(node)`                                                      | 传给根元素的 `:ref`，负责观察与测量                         |
| `getRootProps()` / `getBarProps(barId)`                                     | 可 `v-bind` 的属性表                                        |
| `getPanelStyle(index)` / `getBarStyle(barId)`                               | 内联声明：面板的 `flex-basis`、分隔条的占位与 lazy 预览位移 |
| `getBarControls(barId)`                                                     | 该分隔条上要画的按钮（最多两个，顺序即左右顺序）            |
| `onBarPointerDown` / `onBarKeydown` / `onBarDoubleClick` / `toggleCollapse` | 交互入口                                                    |

`useSplitterPanel(options, splitter)` 由面板组件调用，返回 `index` / `collapsed` / `hasNext` / `disabled` / `resizable` 与 `getPanelProps()` / `getPanelStyle()` / `getPanelSize()`。全部状态收在这一个 composable 里而不拆成第二个：一次分隔条操作同时牵动左右两个面板，尺寸真源必须唯一，两处各持一半就会出现「拖完再解析对不上」的漂移。

容器未测得（首帧、`display: none`）时 `getPanelStyle()` 退回等分兜底 `flex: 1 1 0`，不会出现零宽面板；一旦 `ResizeObserver` 给出真实尺寸即切回写死的 `flex-basis`。

## Primitives 层

```ts
import {
  getSplitterAvailableSize,
  parseSplitterUnit,
  resizeSplitterPair,
  resolveSplitterSizes,
} from '@agile-plus/primitives/splitter';

getSplitterAvailableSize(800, 8, 2);
// → 792，两条面板分掉的正是容器宽度减去一条分隔条

resolveSplitterSizes({
  available: 792,
  sizes: [200, undefined, '25%'],
  mins: [0, 0, 0],
  maxs: [Infinity, Infinity, Infinity],
});
// → [200, 394, 198]，自适应面板吸收定宽与 25% 之外的全部余量

resizeSplitterPair({
  sizes: [396, 396],
  index: 0,
  delta: 5000,
  mins: [0, 100],
  maxs: [Infinity, Infinity],
});
// → [692, 100]，右侧压到 min 后停下，多出来的位移不会凭空挪到别的面板
```

这一层不读 DOM、不依赖 Vue，因此 43 个单测在 node 环境下即可穷尽边界：负值与非有限输入、`'30%'` 与小数百分比、约束冲突时的钳制顺序、`Home` / `End` 的无穷位移、折叠让渡与还原的路径记忆。

## 样式钩子

```text
.y-splitter                              根容器（flex，需要确定尺寸）
.y-splitter__panel                       面板，带 data-index / data-collapsed / data-disabled
[data-part='bar']                        分隔条，带 data-layout / data-resizing / data-disabled
[data-part='bar'] [data-part='bar-control']  折叠按钮，带 data-edge / data-collapsed / data-always
[data-part='bar'] [data-part='bar-icon']      按钮里的箭头图形
```

分隔条由面板自动画出，作者没有位置写 class，因此它的样式钩子是 `data-part`（与 `DatePicker` 的 `[data-part='cell']` 同一取舍）。

组件级变量：`--y-splitter-radius`、`--y-splitter-border`、`--y-splitter-bg`、`--y-splitter-padding`、`--y-splitter-line-size`、`--y-splitter-line-bg`、`--y-splitter-line-bg-active`、`--y-splitter-bar-bg`、`--y-splitter-bar-bg-hover`、`--y-splitter-control-size`、`--y-splitter-control-bg`、`--y-splitter-control-bg-hover`、`--y-splitter-control-border`、`--y-splitter-control-radius`、`--y-splitter-control-color`、`--y-splitter-control-color-hover`、`--y-splitter-icon-size`、`--y-splitter-duration`、`--y-splitter-ease`，以及只由样式层写入的 `--y-splitter-arrow-rotate`。

样式层有两条不能改的约束，都在 `__tests__/splitter.test.ts` 里断编译后的 CSS：

- **根不能有内距**。测量读的是 `clientWidth` / `clientHeight`，内距含在其中：根一加内距，面板总和就会超出内容盒，末段被 `overflow: hidden` 裁掉一条。
- **折叠面板必须把内距一起收掉**。`border-box` 下 `padding` 撑起来的宽度压不进 `flex-basis: 0`，「收起」就收不到 0。

分隔线的厚度只钉排列方向那一轴（`inset: 0` + `margin: auto`，另一轴自动拉满），因此改 `barSize` 不需要跟着改样式，也不给 RTL 留特例：箭头镜像只有一条 `scale: -1 1`。

## 与 antd 的差异

| 项目                   | antd React                              | 本库                                                                           |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| 分隔条                 | 由 `Splitter` 内部按面板数生成          | 同样自动生成，但挂在面板上：根保持「只渲染默认插槽」的形状                     |
| 折叠                   | `collapsible: { start, end, showIcon }` | 形状一致，`showIcon` 另接受 `'auto'`（等价于缺省的悬停才出现）                 |
| 受控                   | `onResize` + 受控 `size`                | `v-model:size` 逐面板，非受控用 `defaultSize`；拖动只发出，写回才生效          |
| `dragger-double-click` | 上报下标                                | 上报下标**并且**复位相邻两个面板（antd 只上报）                                |
| 键盘                   | 未定义方向键行为                        | 方向键 / `Shift` × 5 / `Home` / `End`，分隔条可聚焦并带 `aria-value*`          |
| RTL                    | 未明确                                  | `dir` 参与拖拽与键盘正方向，箭头由 CSS 镜像                                    |
| 嵌套                   | 支持                                    | 可用：面板内容是普通 flex 子元素，内层 `Splitter` 自己测自己的根；尚无专项用例 |

## 已知限制

- **容器必须在排列方向上有确定尺寸**：横向要有宽度（纵向布局的父级高度 `auto` 时同理要给它高度）。读的是实测尺寸，父级为 `fit-content` 时面板反过来影响容器宽度会形成回环，因此测量只在数值真的变化时写入。
- **首帧少一条分隔条**：面板在 setup 里登记，第一个面板在首帧还看不到后面的兄弟，`hasNext` 要等兄弟登记完才翻真。浏览器在同一个微任务里合并这帧，用户看不到中间态；SSR 的客户端首次渲染与 HTML 一致，分隔条随后补上。
- **受控与非受控混用**：一次拖拽只写「像素真的变了」的那几项，其余面板不会收到 `update:size`；受控面板不回写 `size` 就停在原处，这是受控语义而非 bug。
- **`lazy` 下 `resize` 只在抬起时触发一次**：拖拽过程中面板尺寸没变（变的只是分隔条的 `transform`），此时逐帧上报会让使用方以为尺寸已经在动。
- **箭头常驻与悬停揭示是纯视觉**：`showIcon` 只影响 `data-always`，显隐由 CSS 的 `opacity` + `pointer-events` 成对处理。淡出必须连带撤掉点击，否则分隔条上会埋着两个隐形的命中区。
- **不做面板持久化**：尺寸不进 localStorage，也不提供 `collapsible` 的受控折叠态。要保存布局就在 `resize-end` / `collapse` 里自己记账，把 `defaultSize` 存起来下次传回来。
