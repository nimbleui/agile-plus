<script setup>
import AccordionDemo from '../.vitepress/components/AccordionDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# Accordion 手风琴

一组可展开 / 收起的项，对应 Radix Primitives 的 `accordion` 包。根组件管理「哪些项展开」，
每个项内部复用 [Collapsible](./collapsible)——展开动画、高度测量、Presence 退场都来自那一层，
手风琴只新增「集合值管理」与「标题之间的键盘导航」。

## 基础示例

<Preview description="单选（可全部收起）与多选两组手风琴，含禁用项。展开 / 收起带高度 + 透明度动画，终点高度由无头层测量写入 CSS 变量。">
  <AccordionDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { Accordion, AccordionItem } from '@agile-plus/components/accordion';

const value = ref('item-1');
</script>

<template>
  <Accordion v-model:value="value" type="single" collapsible>
    <AccordionItem value="item-1">
      <template #trigger>什么是分层架构？</template>
      <p>primitives → headless → ui → components 四层。</p>
    </AccordionItem>

    <AccordionItem value="item-2">
      <template #trigger>如何换主题？</template>
      <p>覆盖 --y-* 变量即可。</p>
    </AccordionItem>
  </Accordion>
</template>
```

## Accordion

### Props

| 属性           | 类型                  | 默认值      | 说明                                                       |
| -------------- | --------------------- | ----------- | ---------------------------------------------------------- |
| `type`         | `'single' \| 'multiple'` | 必填     | 展开模式，决定值形状                                       |
| `value`        | `string \| string[]`  | `undefined` | 受控值，传入后进入受控模式                                 |
| `defaultValue` | `string \| string[]`  | `undefined` | 非受控初始值，形状跟随 `type`                              |
| `collapsible`  | `boolean`             | `false`     | 仅 `single` 生效：是否允许收起唯一展开项                   |
| `disabled`     | `boolean`             | `false`     | 整组禁用                                                   |

### Events

| 事件           | 参数                       | 说明                                        |
| -------------- | -------------------------- | ------------------------------------------- |
| `update:value` | `value: string \| string[]` | 配合 `v-model:value`；single 给字符串，multiple 给数组 |

### Slots

| 名称      | 说明               |
| --------- | ------------------ |
| `default` | 放置 `AccordionItem` |

## AccordionItem

### Props

| 属性       | 类型      | 默认值  | 说明                       |
| ---------- | --------- | ------- | -------------------------- |
| `value`    | `string`  | 必填    | 项值，组内唯一             |
| `disabled` | `boolean` | `false` | 单项禁用（组禁用或项禁用） |

### Slots

| 名称      | 说明           |
| --------- | -------------- |
| `trigger` | 触发标题条内容 |
| `default` | 展开后的主体   |

## 值语义

内部统一用数组归一化，`single` 只是「长度不超过 1」的特例，序列化只在出口发生：

- **single**：展开某项替换整个值；收起时取决于 `collapsible`——`true` 允许全部收起（值变空串），
  `false` 时点击已展开项**不收起**（始终保留一项展开）。这是手风琴与 ToggleGroup 的关键区别。
- **multiple**：展开追加、收起移除，值是字符串数组。

受控判定与其它组件一致：`undefined` 是「未受控」的唯一判据，`value` 缺省必须保持 `undefined`。

## 无样式层用法

```vue
<script setup lang="ts">
import {
  AccordionContent,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from '@agile-plus/ui/accordion';
</script>

<template>
  <AccordionRoot v-model:value="value" type="single" collapsible>
    <AccordionItem value="item-1">
      <AccordionTrigger>标题</AccordionTrigger>
      <AccordionContent>内容</AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
```

四个部件都支持 `as` 与 `asChild`；`AccordionContent` 另有 `forceMount`（强制挂载，自己控制动画时用）。
项的展开态由组值受控驱动，`AccordionItem` 上没有 `open` 属性，避免两处真源。

## 无障碍行为

| 项     | 说明                                                                       |
| ------ | -------------------------------------------------------------------------- |
| 触发器 | `type="button"` + `aria-expanded`（始终输出布尔值）                        |
| 关联   | 展开时 `aria-controls` 指向 Content 的 id；收起后不输出，避免悬空引用      |
| 键盘   | ↑ / ↓ 在可用项之间**移动焦点**（不展开），Home / End 跳首尾，禁用项被跳过  |
| 展开   | Enter / Space 或点击触发（原生 button 已处理），箭头只移动焦点             |
| 焦点序 | 每个标题都是独立 Tab 停靠点（不做罗盘 tabindex，这与 Tabs/ToggleGroup 不同）|
| 禁用   | 原生 `disabled` + `data-disabled`                                          |

## 展开动画

项内部复用 Collapsible 的测量：开合变化后测量 Content 自然高度，写成内联变量
`--y-collapsible-content-height`，样式层用它做 `@keyframes` 终点。**做高度动画的元素自身不能带纵向内距**：
`box-sizing: border-box` 下它最低只能压到内距本身，动画前一段全在无效行程里，看起来就是点下去停一拍才动；
末段间距因此由 `::after` 占位提供，它随内容一起被裁切，收起时高度也能真正回到 0。
退场依赖共享 `usePresence`，动画结束才卸载节点；reduced-motion 下动画整体关闭、退场回到即时卸载。
机制细节见 [Collapsible 的高度动画](./collapsible#高度动画是怎么做到的)。

## 样式钩子

```text
.y-accordion                       外框
.y-accordion[data-disabled]        整组禁用
.y-accordion__item                 项（项间分隔线，末项无）
.y-accordion__item[data-state]     项展开态 open / closed
.y-accordion__trigger              标题按钮（箭头是 ::after，随 data-state 旋转）
.y-accordion__content              内容区（进出场动画在这里）
```

组件级变量：`--y-accordion-radius`、`--y-accordion-border`、`--y-accordion-bg`、
`--y-accordion-trigger-hover-bg`、`--y-accordion-padding-block`、`--y-accordion-padding-inline`、
`--y-accordion-content-padding-inline`、`--y-accordion-duration`、`--y-accordion-ease`、
`--y-accordion-arrow-size`。测量变量 `--y-collapsible-content-height/width` 由无头层内联写入，
**不要**在样式层重新声明。

## 已知限制

- 高度动画终点是**测量时**的自然高度；展开后内容自己变高（异步加载、换行）不会自动更新变量，
  与 Collapsible 同一条限制。
- 键盘导航固定纵向（↑ / ↓），不提供横向排布；手风琴语义上是垂直堆叠的标题列表。

## Primitives 层

```ts
import {
  getAccordionItemAttrs,
  getAccordionRootAttrs,
  isAccordionItemOpen,
  normalizeAccordionValue,
  resolveAccordionValue,
  serializeAccordionValue,
} from '@agile-plus/primitives/accordion';

normalizeAccordionValue('single', 'a'); // ['a']
resolveAccordionValue({ type: 'single', collapsible: false, value: ['a'], itemValue: 'a', open: false });
// ['a'] —— 非 collapsible 收起已展开项是 no-op
serializeAccordionValue('single', []); // ''
getAccordionItemAttrs({ open: true, disabled: false }); // { 'data-state': 'open', 'data-disabled': undefined }
```

键盘导航复用 `@agile-plus/primitives/tabs` 的 `handleTabsKeydown`（纵向），只取焦点落点、
忽略 `shouldActivate`。