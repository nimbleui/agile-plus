<script setup>
import DatePickerDemo from '../.vitepress/components/DatePickerDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# DatePicker 日期选择

输入或点选一个日期。四层实现：`primitives/date` 负责日历网格、格式化 / 解析与按键解析，`headless/useDatePicker` 负责选中值与开合两个受控状态、面板与焦点日期、输入草稿、定位与表单接入，`ui/date-picker` 提供 ARIA 结构与 portal，`components/date-picker` 注入样式。零依赖：不引 dayjs / date-fns，日期计算与 token 格式化全部自建。

**焦点始终留在输入框上。** 与 Select 相同的 combobox 模型：输入框是 `role="combobox"`，面板是 `role="dialog"`，网格是 `role="grid"`，焦点格通过 `aria-activedescendant` 指向，而不是把焦点移进浮层。因此不需要焦点陷阱、不锁滚动，`Tab` 天然能走出组件；格子点击不会抢走焦点（`pointerdown` 被拦掉），手动输入与点选可以无缝交替。

**三级面板**：日期网格（6 行 7 列，首尾补齐相邻月）、月份网格（3 列 4 行）、年代网格（3 列 4 行，首尾补相邻年代年份）。点头部「年 / 月」按钮上钻，点格子逐级下钻：年代 → 月份 → 日期。

**日期时间**：`showTime` 开启后日历右侧多出时 / 分 / 秒三列滚动选择，选日期保留已选时间且不关闭面板，页脚换成「此刻 / 确定」；值与输入格式缺省升级为 `YYYY-MM-DD HH:mm:ss`。

**面板的挂载时机**：首次打开才挂载（`usePresence` 的 v-if）；打开过一次之后**常驻不销毁**——成品层 `keepMounted` 默认为真，关闭只剩 `data-state="closed"` 加样式隐藏。要「关闭即卸载」就传 `:keep-mounted="false"`。

## 基础示例

<Preview description="实时演练场、三档尺寸与三种外观、禁用日期、自定义单元格、额外页脚、受控开合、表单提交与重置。">
  <DatePickerDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { DatePicker } from '@agile-plus/components/date-picker';

const date = ref<string | null>(null);
</script>

<template>
  <DatePicker v-model="date" clearable />
</template>
```

## 值与格式

选中值恒为字符串（或 `null`），存储格式由 `valueFormat` 决定，输入框的显示与手动输入格式由 `format` 决定；两者缺省随 `showTime`：关为 `YYYY-MM-DD`，开为 `YYYY-MM-DD HH:mm:ss`。两者分离：显示可以是 `YYYY年M月D日`，提交与存储仍是 ISO。

```vue
<DatePicker v-model="date" format="YYYY年M月D日" value-format="YYYY-MM-DD" />
```

支持的 token：日期 `YYYY` / `YY` / `MM` / `M` / `DD` / `D`，时间 `HH` / `H` / `mm` / `m` / `ss` / `s`（大小写敏感：`M` 是月、`m` 是分），其余字符（含中文「年月日」「时分秒」）按字面量处理。手动输入按 `format` 严格解析，做**真日历校验**：`2023-02-29`、`2023-13-01`、`24:00`、`12:60` 一律视为非法，blur / Enter 时静默回退到当前选中值；清空文本后 blur 会清空值。两位年份归 2000-2099。

## 日期时间（showTime）

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { DatePicker } from '@agile-plus/components/date-picker';

const datetime = ref<string | null>(null);
</script>

<template>
  <DatePicker v-model="datetime" show-time clearable />
</template>
```

- 选日期**不关闭**面板：日期部分换成点选那天，时间部分保留已选值（没选过落零点），等「确定」才提交关闭；`Enter` 同样确认整个值。
- 时间三列点选即时写值：日期部分取选中值，没选过日期落今天，因此「先选时间后选日期」也成立。选中项在开合与值变化时滚进列可视区，只滚列自己，不牵连页面。
- 「此刻」写当前日期时间并关闭；「确定」提交输入草稿并关闭。文案可用 `nowLabel` / `confirmLabel` 覆盖。
- 精度由 `format` / `valueFormat` 收紧：`format="YYYY-MM-DD HH:mm"` 只显示到分钟，存储仍含秒。
- 时间列是 `role="listbox"` + `role="option"`，点击不抢焦点（与格子同一条 `pointerdown` 拦截）；键盘用户直接在输入框敲时间，走同一套解析校验。

## 禁用日期

`disabledDate` 逐日判定，入参是本地零点的日期。禁用格保留在网格里：指针不可选，键盘焦点可以经过，Enter 不会选值；「今天」按钮在今天被禁用时同步禁用。

```vue
<script setup lang="ts">
function disableWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}
</script>

<template>
  <DatePicker v-model="date" :disabled-date="disableWeekend" />
</template>
```

## 成品层 Props

| 属性                     | 类型                                     | 默认值           | 说明                                          |
| ------------------------ | ---------------------------------------- | ---------------- | --------------------------------------------- |
| `modelValue` / `v-model` | `string \| null`                         | `undefined`      | 受控选中值（valueFormat 格式）；不传即非受控  |
| `defaultValue`           | `string \| null`                         | `null`           | 非受控初值，null 表示未选择                   |
| `valueFormat`            | `string`                                 | 随 showTime      | 选中值的存储格式；缺省日期或日期时间          |
| `format`                 | `string`                                 | 随 showTime      | 输入框显示 / 输入格式；缺省规则同上           |
| `showTime`               | `boolean`                                | `false`          | 开启时分秒选择，选日期不关闭，页脚此刻/确定   |
| `open` / `v-model:open`  | `boolean`                                | `undefined`      | 受控开合；不传即非受控                        |
| `defaultOpen`            | `boolean`                                | `false`          | 非受控开合初值                                |
| `placeholder`            | `string`                                 | 随 showTime      | 占位文案；缺省「请选择日期 / 请选择日期时间」 |
| `size`                   | `'small' \| 'middle' \| 'large'`         | `'middle'`       | 尺寸，高度与字号取自全局 Token                |
| `variant`                | `'outlined' \| 'filled' \| 'borderless'` | `'outlined'`     | 外观                                          |
| `disabled`               | `boolean`                                | `false`          | 整体禁用                                      |
| `disabledDate`           | `(date: Date) => boolean`                | `undefined`      | 逐日禁用判定                                  |
| `firstDayOfWeek`         | `number`（0-6）                          | `1`              | 每周起始日，默认周一                          |
| `clearable`              | `boolean`                                | `false`          | 有值时显示清除按钮                            |
| `clearLabel`             | `string`                                 | `'清除'`         | 清除按钮的读屏文案                            |
| `showToday`              | `boolean`                                | `true`           | 页脚显示「今天」按钮（showTime 时换成此刻）   |
| `todayLabel`             | `string`                                 | `'今天'`         | 今天按钮文案                                  |
| `nowLabel`               | `string`                                 | `'此刻'`         | 此刻按钮文案（showTime）                      |
| `confirmLabel`           | `string`                                 | `'确定'`         | 确定按钮文案（showTime）                      |
| `block`                  | `boolean`                                | `false`          | 占满一行                                      |
| `name` / `form`          | `string`                                 | `undefined`      | 表单字段名与显式归属的表单 id                 |
| `ariaLabelledby`         | `string`                                 | `undefined`      | 指向标题元素 id                               |
| `ariaDescribedby`        | `string`                                 | `undefined`      | 指向说明元素 id                               |
| `placement`              | `FloatingPlacement`                      | `'bottom-start'` | 期望位置，可带 `-start` / `-end` 对齐         |
| `offset`                 | `number \| FloatingOffset`               | `4`              | 与输入框的间距                                |
| `flip` / `shift`         | `boolean`                                | `true`           | 空间不足时翻转 / 沿交叉轴钳制                 |
| `padding`                | `number`                                 | `8`              | 与视口边缘的最小留白                          |
| `strategy`               | `'fixed' \| 'absolute'`                  | `'absolute'`     | 定位策略；默认随文档原生滚动                  |
| `container`              | `string \| HTMLElement`                  | `'body'`         | portal 目标                                   |
| `keepMounted`            | `boolean`                                | `true`           | 打开过一次之后常驻 DOM；关掉即回到关闭即卸载  |

事件：`update:modelValue`（`string | null`）、`update:open`、`clear`。

插槽：`cell`（自定义日期格子，scoped `{ date, selected, disabled, today, inMonth }`）、`footer`（页脚额外内容，渲染在「今天」按钮之后）。

## 无样式层部件

| 部件                | 渲染                | 职责                                                       |
| ------------------- | ------------------- | ---------------------------------------------------------- |
| `DatePickerRoot`    | 不渲染元素          | 持有全部状态，下发上下文；expose 面板导航 API 供成品层使用 |
| `DatePickerInput`   | `<input>`           | `role="combobox"`，全部键盘交互绑在这里                    |
| `DatePickerContent` | portal 后的 `<div>` | `role="dialog"`、定位样式、`data-side` / `data-panel`      |
| `DatePickerGrid`    | `<div>`             | `role="grid"`，星期表头与行结构；`kind` 决定三张网格       |
| `DatePickerCell`    | `<div>`             | `role="gridcell"`，aria / data-* 来自无头层统一判定        |

脱离 `DatePickerRoot` 使用会抛错，而不是静默失效。自行组合时面板头部（翻页按钮、年月切换）与页脚属于视觉结构，由消费者渲染，调用 Root expose 的 `setPanel` / `shiftView` / `goToday` 等方法驱动。

## 键盘交互

焦点在输入框上，按键按当前面板解析：

| 按键               | 关闭态           | 日期面板                   | 月份 / 年代面板    |
| ------------------ | ---------------- | -------------------------- | ------------------ |
| `↓` / `↑`          | 打开             | 焦点移一周                 | 焦点移一行（3 格） |
| `←` / `→`          | 不接管           | 焦点移一天                 | 焦点移一格         |
| `PageUp/Down`      | 不接管           | 翻月                       | 翻年 / 翻年代      |
| `Home` / `End`     | 不接管           | 本周首日 / 末日            | 不接管             |
| `Enter`            | 有草稿时提交文本 | 选中焦点日并关闭           | 下钻一级           |
| `Esc`              | 不接管           | 关闭，丢弃草稿             | 关闭，丢弃草稿     |
| `Tab`              | 不接管           | 关闭，焦点继续走向下一控件 | 同左               |
| 可打印字符         | 直接编辑文本     | 直接编辑文本               | 直接编辑文本       |
| 带 `Ctrl/Alt/Meta` | 交还浏览器       | 交还浏览器                 | 交还浏览器         |

空格是输入框的合法文本，不是确认键——这是与 Select（button 触发器）的刻意差异。焦点跨月移动时面板自动翻月；月末焦点翻月按日历 clamp（1 月 31 日 → 2 月 28 日）。`showTime` 时 Enter 的语义是「确认整个值」：选焦点日（保留已选时间）并关闭面板。

## 表单接入

`name` 落在输入框上参与原生提交（提交值是 `format` 显示格式）；`form.reset()` 把值还原到 `defaultValue`，与 Checkbox / Select 走同一个 `useFormResetListener`。

## 无障碍行为

- 输入框：`role="combobox"`、`aria-expanded`、`aria-controls`；打开时 `aria-owns` 声明对 portal 面板的所有权，`aria-activedescendant` 指向焦点格。
- 面板：`role="dialog"`，`aria-labelledby` 指向输入框（或 `ariaLabelledby`）。
- 网格：`role="grid"` + `aria-label`（当前年月 / 年代区间）；星期表头 `role="columnheader"`；格子 `role="gridcell"` + `aria-selected` / `aria-disabled`，日期格子带完整日期的 `aria-label`（格内只渲染「几号」，读屏需要完整上下文）。
- 时间列：`role="listbox"` + `aria-label`（选择小时 / 分钟 / 秒），选项 `role="option"` + `aria-selected`。
- 关闭态面板 `visibility: hidden`，移出无障碍树；常驻挂载不会让读屏播报隐藏内容。

## 已知限制

- 只支持单日期选择；范围选择见 [DateRangePicker 期间选择](./date-range-picker.md)。周 / 月 / 年 picker 刻意不做，等真实需求出现再按同一分层扩展；范围选择的时间版本同样未做。
- 星期短名与头部文案默认中文，未做国际化抽离。
- 面板宽度固定：日期模式 280px，showTime 模式加宽容纳时间三列；不跟随输入框宽度。这是日历网格的可读性决定，与 Select 的「列表至少与触发器同宽」不同。
- 时间列不支持键盘逐项导航：焦点模型留在输入框，键盘用户用手动输入覆盖时间编辑。
