<script setup>
import EllipsisDemo from '../.vitepress/components/EllipsisDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# Ellipsis 文本省略

把超出容器的文本截断并给出省略号，对应 Ant Design Typography 的 ellipsis / TDesign Ellipsis 一类能力。四层实现：`primitives/ellipsis` 负责行数归一、中间省略切分、溢出判定与功能性样式；`headless/useEllipsis` 负责溢出测量、展开态与样式产出；`ui/ellipsis` 提供结构、ARIA 与 Tooltip 复用；`components/ellipsis` 注入字号与装饰。

**截断是行为不是装饰。** 单行 / 多行 / 中间省略的功能性内联样式由无头层产出、无样式层直接绑定，保证不引 CSS 也能正确省略；颜色 / 字号 / 间距仍留给样式层。

## 基础示例

<Preview description="实时演练场（模式 / 尺寸 / 文本 / 行数 / 尾部保留 / 容器宽度 / 可展开 / Tooltip 全部即时生效）、三种模式、表格单元格中间省略、展开收起与不可断行长串。">
  <EllipsisDemo />
</Preview>

```vue
<script setup lang="ts">
import { Ellipsis } from '@agile-plus/components/ellipsis';
</script>

<template>
  <div style="width: 240px">
    <Ellipsis mode="multi" :lines="2" expandable>
      这是一段足够长的中文文本，超出两行时截断，并给出展开按钮。
    </Ellipsis>
  </div>
</template>
```

## 成品层 Props

| 属性                    | 类型                                     | 默认值     | 说明                                       |
| ----------------------- | ---------------------------------------- | ---------- | ------------------------------------------ |
| `mode`                  | `'single' \| 'multi' \| 'middle'`        | `'single'` | 省略模式                                   |
| `lines`                 | `number`                                 | `2`        | multi 行数；single / middle 恒为 1         |
| `tailChars`             | `number`                                 | `4`        | middle 保留的尾部字符数（按码点切分）      |
| `expandable`            | `boolean`                                | `false`    | 溢出时显示「展开 / 收起」按钮              |
| `expandText`            | `string`                                 | `'展开'`   | 展开按钮文案                               |
| `collapseText`          | `string`                                 | `'收起'`   | 收起按钮文案                               |
| `tooltip`               | `boolean`                                | `true`     | 溢出且未展开时用 Tooltip 展示全文          |
| `expanded` / `v-model:expanded` | `boolean`                          | `undefined`| 受控展开态；不传即非受控                   |
| `defaultExpanded`       | `boolean`                                | `false`    | 非受控展开初值                             |
| `size`                  | `'small' \| 'middle' \| 'large'`         | `'middle'` | 字号尺寸                                   |

事件：`update:expanded`。插槽：默认插槽（被省略的文本）。

## 三种模式

- **single**：单行尾部省略（`text-overflow: ellipsis`）。溢出看横向 `scrollWidth > clientWidth`。
- **multi**：按行数截断（`-webkit-line-clamp`）。溢出看纵向 `scrollHeight > clientHeight`——line-clamp 的截断发生在纵向，横向永远不溢出。
- **middle**：中间省略，保留尾部若干字符，适合文件名 / 路径 / 哈希。靠 flex 让 head（完整文本）收缩出省略号、tail 固定不收缩，**不需要按宽度二分字符数**（那会引入逐帧测量）。tail 是 head 的重复副本，因此 `aria-hidden` 且 `user-select: none`，读屏与复制都只拿到一份完整文本。

## 溢出测量与展开

- 测量遵循「统一读取 → 纯计算 → 统一写入」：一次读齐四个尺寸读数交给 `primitives/ellipsis` 判定；resize 经 rAF 合并，同一帧不重复量；容器尺寸变化由 `useResizeObserver` 触发，文本 / 模式 / 行数变化由 UI 层上报后重测。
- 溢出判定是 **sticky** 的：展开后不再重判（展开态恒不溢出），但保留展开前的 `true`，否则「收起」按钮会在展开那一刻消失、用户收不回去。文本 / 模式 / 行数变化时先清零再重测。
- 展开态交还自然排版（功能性样式返回空对象）。

## Tooltip 复用与结构稳定

溢出且未展开时复用同层 `Tooltip` 展示全文，并把触发盒设为可聚焦（键盘用户 Tab 到截断文本即可读全文）；未溢出时不挂 Tooltip 内容也不加 `tabindex`，避免把普通文本变成多余的 Tab 落点。

两个结构约束是刻意的：

- **Tooltip 外壳始终挂载**，用受控 `open` 闸门住是否允许打开。不能按 overflow 条件 remount 截断元素——那会让测量读到新节点的 0 尺寸后又判不溢出，来回振荡且丢测量。
- **触发盒与截断元素分离**：`TooltipTrigger as-child` 会把自己的 `data-part` / `data-state` 合并到克隆子元素上，若直接把截断元素交给它会覆盖掉测量元素的标识与状态。因此外层是触发盒、内层才是被测量的截断元素。

## 无障碍行为

| 项     | 说明                                                                 |
| ------ | -------------------------------------------------------------------- |
| 状态   | `data-state` 三态 `full` / `clamped` / `expanded`，供样式层选择        |
| 全文   | 溢出时触发盒可聚焦，Tooltip 读全文；middle 的 tail `aria-hidden`       |
| 复制   | middle 的 tail `user-select: none`，复制不会得到重复尾部              |
| 展开   | 展开 / 收起是真实 `<button type="button">`，带焦点环                  |
| 减少动效 | 组件无进出场动画，天然尊重 reduced-motion                           |

## 已知限制

- **middle 不做按宽度自适应保留数**：保留尾部字符数由 `tailChars` 固定，head 靠 CSS 收缩；要按宽度动态决定保留数需逐帧测量，刻意不做。
- **multi 依赖 `-webkit-line-clamp`**：现代浏览器均支持；极老内核退化为不截断（内容完整可读），不会丢文本。
- **Tooltip 全文不做富文本**：全文即默认插槽文本；需要富内容全文时自行组合 `ui/tooltip`。
