<script setup>
import DateRangePickerDemo from '../.vitepress/components/DateRangePickerDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# DateRangePicker 期间选择

选择一个连续的日期期间（起点 → 终点）。与 [DatePicker](./date-picker.md) 共享同一套日历 / 格式 / 按键原语：`primitives/date` 的范围点选与高亮判定、`headless/useDateRangePicker` 的两端值与活跃端管理、`ui/date-range-picker` 的 ARIA 结构、`components/date-range-picker` 的样式。

**双输入框 + 左右两月面板。** 点起点后活跃端自动切到终点输入框，移动指针看到虚线预览范围，点终点即提交关闭；终点早于起点时**自动交换两端**，同一天起终是合法的单日期间。右面板恒为左面板的下一个月，头部按钮翻月 / 翻年时两月一起移动。

**焦点模型与单选一致。** 焦点始终留在活跃输入框上，面板用 `aria-activedescendant` 指向焦点格（恒在左面板）。`Tab` 打开态先在两端之间切换，再按才走出组件；`Shift+Tab` 反向。

**草稿语义**：点选未完成时外部点击 / Escape 丢弃点选草稿；手动输入的文本按 blur 规则提交——只输入一端时保留为待定草稿（关闭后仍回显），另一端补齐即合成范围，Escape 则全部丢弃。

## 基础示例

<Preview description="实时演练场、基础与回显、三档尺寸与三种外观、禁用日期、快捷预设、自定义单元格、受控开合。">
  <DateRangePickerDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { DateRangePicker } from '@agile-plus/components/date-range-picker';

const range = ref<[string, string] | null>(null);
</script>

<template>
  <DateRangePicker v-model="range" clearable />
</template>
```

## 值与格式

选中值是 `[起点, 终点]` 二元组（或 `null`），两端字符串按 `valueFormat` 存储（默认 `YYYY-MM-DD`），输入框按 `format` 显示与解析。token 与校验规则与 DatePicker 完全相同（真日历校验、非法回退、空文本清空整个范围）。

## 禁用日期

`disabledDate` 只约束**两端**：范围内部经过的禁用日不阻断选择——期间是连续区间，不是逐日勾选。这与主流范围选择器一致。

## 快捷预设

`presets` 渲染在面板页脚，点击直接提交整个期间；两端任一被 `disabledDate` 命中时拒绝生效。

```vue
<script setup lang="ts">
const presets = [
  { label: '最近 7 天', value: ['2026-11-10', '2026-11-16'] },
  { label: '本月', value: ['2026-11-01', '2026-11-30'] },
];
</script>

<template>
  <DateRangePicker v-model="range" :presets="presets" />
</template>
```

## 成品层 Props

| 属性                     | 类型                                           | 默认值                     | 说明                             |
| ------------------------ | ---------------------------------------------- | -------------------------- | -------------------------------- |
| `modelValue` / `v-model` | `[string, string] \| null`                     | `undefined`                | 受控选中范围；不传即非受控       |
| `defaultValue`           | `[string, string] \| null`                     | `null`                     | 非受控初值                       |
| `valueFormat`            | `string`                                       | `'YYYY-MM-DD'`             | 两端字符串的存储格式             |
| `format`                 | `string`                                       | `'YYYY-MM-DD'`             | 输入框显示 / 输入格式            |
| `open` / `v-model:open`  | `boolean`                                      | `undefined`                | 受控开合；不传即非受控           |
| `defaultOpen`            | `boolean`                                      | `false`                    | 非受控开合初值                   |
| `placeholders`           | `[string, string]`                             | `['开始日期', '结束日期']` | 两端占位文案                     |
| `size`                   | `'small' \| 'middle' \| 'large'`               | `'middle'`                 | 尺寸，高度与字号取自全局 Token   |
| `variant`                | `'outlined' \| 'filled' \| 'borderless'`       | `'outlined'`               | 外观                             |
| `disabled`               | `boolean`                                      | `false`                    | 整体禁用                         |
| `disabledDate`           | `(date: Date) => boolean`                      | `undefined`                | 逐日禁用判定，只约束两端         |
| `firstDayOfWeek`         | `number`（0-6）                                | `1`                        | 每周起始日，默认周一             |
| `clearable`              | `boolean`                                      | `false`                    | 有值时显示清除按钮               |
| `clearLabel`             | `string`                                       | `'清除'`                   | 清除按钮的读屏文案               |
| `block`                  | `boolean`                                      | `false`                    | 占满一行                         |
| `presets`                | `{ label: string; value: [string, string] }[]` | `[]`                       | 页脚快捷预设                     |
| `ariaLabelledby`         | `string`                                       | `undefined`                | 指向标题元素 id                  |
| `ariaDescribedby`        | `string`                                       | `undefined`                | 指向说明元素 id                  |
| `placement`              | `FloatingPlacement`                            | `'bottom-start'`           | 期望位置，对齐整个控件而非某一端 |
| `offset`                 | `number \| FloatingOffset`                     | `4`                        | 与控件的间距                     |
| `flip` / `shift`         | `boolean`                                      | `true`                     | 空间不足时翻转 / 沿交叉轴钳制    |
| `padding`                | `number`                                       | `8`                        | 与视口边缘的最小留白             |
| `strategy`               | `'fixed' \| 'absolute'`                        | `'absolute'`               | 定位策略                         |
| `container`              | `string \| HTMLElement`                        | `'body'`                   | portal 目标                      |
| `keepMounted`            | `boolean`                                      | `true`                     | 打开过一次之后常驻 DOM           |

事件：`update:modelValue`（`[string, string] | null`）、`update:open`、`clear`。

插槽：`cell`（自定义格子，scoped `{ date, selected, disabled, today, inMonth, isStart, isEnd, inRange, isHoverEnd, inPreview }`）、`separator`（两端之间的分隔符）、`footer`（页脚额外内容）。

## 无样式层部件

| 部件                     | 渲染                | 职责                                       |
| ------------------------ | ------------------- | ------------------------------------------ |
| `DateRangePickerRoot`    | 不渲染元素          | 持有两端值、活跃端与草稿，下发上下文       |
| `DateRangePickerInput`   | `<input>`           | `role="combobox"`，`index` 决定起点 / 终点 |
| `DateRangePickerContent` | portal 后的 `<div>` | `role="dialog"`、定位样式、`data-side`     |
| `DateRangePickerGrid`    | `<div>`             | `role="grid"`，`side` 决定左 / 右月网格    |
| `DateRangePickerCell`    | `<div>`             | `role="gridcell"`，驱动点选与悬停预览      |

左右面板含相同的补齐日期，格子 id 带 `side` 才唯一；`aria-activedescendant` 只声明在活跃输入框上，避免读屏重复播报。

## 键盘交互

| 按键               | 关闭态           | 打开态                                 |
| ------------------ | ---------------- | -------------------------------------- |
| `↓` / `↑`          | 打开             | 焦点移一周                             |
| `←` / `→`          | 不接管           | 焦点移一天                             |
| `PageUp/Down`      | 不接管           | 翻月（左右两月一起）                   |
| `Home` / `End`     | 不接管           | 本周首日 / 末日                        |
| `Enter`            | 有草稿时提交文本 | 把焦点日落入活跃端；终点落定即提交关闭 |
| `Tab`              | 不接管           | 起点→终点；再按关闭并走出组件          |
| `Shift+Tab`        | 不接管           | 终点→起点；再按关闭并走出组件          |
| `Esc`              | 不接管           | 关闭，丢弃全部草稿                     |
| 可打印字符         | 直接编辑文本     | 直接编辑文本                           |
| 带 `Ctrl/Alt/Meta` | 交还浏览器       | 交还浏览器                             |

## 无障碍行为

- 两端输入框均为 `role="combobox"`，活跃端带 `data-active`；打开时 `aria-owns` 声明面板所有权。
- 面板 `role="dialog"`；左右网格各带月份 `aria-label`；格子 `aria-selected` 只在两端为真，区间内部靠 `data-in-range` 表达（读屏播报「选中」仅指端点，与视觉一致）。
- 预览范围用 `data-preview` / `data-hover-end` 表达，悬停端点虚线描边，不改变 `aria-selected`。

## 已知限制

- 只有日期面板，没有月份 / 年代下钻（头部按钮直接翻月 / 翻年）；范围选择里下钻面板的收益低，主流实现也大多如此。
- 不支持 `name` / `form` 原生表单接入：期间是二元组，原生字段语义不明确，需要时由消费者用两个隐藏字段承载。
- 窄视口（≤600px）双面板纵向堆叠，宽度回到 280px。
