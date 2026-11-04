<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import FlexDemo from '../.vitepress/components/FlexDemo.vue';
</script>

# Flex 弹性布局

容器与单项的弹性布局原子。容器词汇对齐 Radix Themes 的 `Flex`（`direction` / `align` / `justify` / `wrap` / `gap`），单项覆盖对齐 Ark UI 的 `Flex.Item`（`flex` / `grow` / `shrink` / `basis` / `order` / `alignSelf`），并首次在本库引入 `asChild`。

## 基础示例

<Preview description="依次演示：档位间距与换行、纵向排列 + 起始对齐、两端分布、单项撑满与不收缩、单项各自的交叉轴对齐，以及 asChild 让 ul 自身成为容器。">
  <FlexDemo />
</Preview>

```vue
<script setup lang="ts">
import { Flex, FlexItem } from '@agile-plus/components/flex';
</script>

<template>
  <Flex align="center" justify="between" gap="md" wrap="wrap">
    <span>左侧</span>
    <FlexItem :shrink="0">不收缩</FlexItem>
  </Flex>
</template>
```

## 无样式层用法

`@agile-plus/ui/flex` 不含任何类名，布局值以 `data-*` 钩子输出，类名由消费者决定 —— 这与 Tabs、RadioGroup 的契约一致：

```vue
<script setup lang="ts">
import { FlexItem, FlexRoot } from '@agile-plus/ui/flex';
</script>

<template>
  <FlexRoot direction="column" gap="sm" class="y-flex">
    <FlexItem :grow="1" class="y-flex-item">撑满剩余空间</FlexItem>
  </FlexRoot>
</template>
```

也可以完全不用样式层，只引 primitives 自己做映射：

```ts
import { getFlexAttrs, getFlexStyles } from '@agile-plus/primitives/flex';

getFlexAttrs({ direction: 'column', gap: 'md', inline: true });
// { 'data-direction': 'column', 'data-gap': 'md', 'data-inline': '' }

getFlexStyles({ gap: '8px 16px' });
// { gap: '8px 16px' }
```

## Flex

### Props

| 属性        | 类型                                                                | 默认值      | 说明                                                             |
| ----------- | ------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| `direction` | `'row' \| 'column' \| 'row-reverse' \| 'column-reverse'`            | `undefined` | 主轴方向；未提供时保持 CSS 初始值 `row`                          |
| `align`     | `'start' \| 'center' \| 'end' \| 'baseline' \| 'stretch'`           | `undefined` | 交叉轴对齐；`start` / `end` 映射为 `flex-start` / `flex-end`     |
| `justify`   | `'start' \| 'end' \| 'center' \| 'between' \| 'around' \| 'evenly'` | `undefined` | 主轴分布；映射为对应的 `space-*` 值                              |
| `wrap`      | `'nowrap' \| 'wrap' \| 'wrap-reverse'`                              | `undefined` | 换行行为，不用布尔值：`wrap-reverse` 无法由布尔表达              |
| `gap`       | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| string`                    | `undefined` | 档位走 `data-gap` 查 Token；其余字符串作为任意 CSS 值内联        |
| `inline`    | `boolean`                                                           | `false`     | 是否使用 `inline-flex`                                           |
| `as`        | `string`                                                            | `'div'`     | 渲染的原生标签名，如 `section`、`ul`                             |
| `asChild`   | `boolean`                                                           | `false`     | 不渲染自身容器，把布局属性合并到唯一子元素上；开启时 `as` 被忽略 |

档位间距实际值：`xs` 4px、`sm` 8px、`md` 16px、`lg` 24px、`xl` 32px，来自 `--y-padding-*`，主题可覆盖组件级变量。

## FlexItem

| 属性        | 类型                                                                | 默认值      | 说明                                                 |
| ----------- | ------------------------------------------------------------------- | ----------- | ---------------------------------------------------- |
| `flex`      | `string`                                                            | `undefined` | CSS `flex` 简写原值，如 `'1 1 auto'`                 |
| `grow`      | `number`                                                            | `undefined` | `flex-grow`；传 `0` 会真实写入声明，与「不设置」不同 |
| `shrink`    | `number`                                                            | `undefined` | `flex-shrink`；不设置时为 CSS 初始值 1               |
| `basis`     | `string`                                                            | `undefined` | `flex-basis` 原值，如 `'0'`、`'30%'`                 |
| `order`     | `number`                                                            | `undefined` | `order`；只改变视觉排列，不改变 DOM 与键盘焦点顺序   |
| `alignSelf` | `'auto' \| 'start' \| 'center' \| 'end' \| 'baseline' \| 'stretch'` | `undefined` | 单项交叉轴对齐；`auto` 等同 CSS 初始值，不输出声明   |
| `as`        | `string`                                                            | `'div'`     | 语义同 `Flex` 的 `as`                                |
| `asChild`   | `boolean`                                                           | `false`     | 语义同 `Flex` 的 `asChild`                           |

`flex` 简写先输出、`grow` / `shrink` / `basis` 长写随后输出，因此同时提供时长写生效，与手写 CSS 的顺序一致。

## 布局值的落点

| 类别                                                 | 落点                        | 原因                                                                    |
| ---------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------- |
| 有限枚举（6 个布局轴）                               | `data-*` 属性，声明在样式层 | 可被属性选择器穷举，交给 CSS 才能跟随主题                               |
| 任意 CSS 值（`gap` 字符串、`flex` / `basis` / 数值） | 元素自身的内联声明          | 无法穷举，只能交给浏览器解析                                            |
| 未提供的字段                                         | 什么都不输出                | 保持 CSS 初始值，样式层也不写默认声明，避免覆盖外层容器对同一元素的设置 |

## Slot 与 asChild

`Slot` 是无头层的共享渲染原语（`@agile-plus/ui` 导出），对齐 Radix / Reka 的 Slot / Primitive：

```vue
<!-- 不产生额外 div，布局属性直接落到 ul 自身 -->
<Flex as-child gap="sm" justify="end">
  <ul class="my-list">
    <li>第一项</li>
  </ul>
</Flex>
```

合并规则：`class` 累加、`style` 逐键合并、同名事件先子后父串联、其余标量属性以宿主转发的值为准。注释节点（`v-if` 未命中）与纯空白文本（模板换行）不计入子元素数量，因此等价写法不会随机失败；可渲染子元素数量不等于 1 时抛出开发期错误。

## Primitives 层

| 导出                        | 签名                                    | 说明                                         |
| --------------------------- | --------------------------------------- | -------------------------------------------- |
| `FLEX_GAP_SCALES`           | `readonly ['xs','sm','md','lg','xl']`   | 档位白名单，与样式层 `@each $scale` 一一对应 |
| `isFlexGapScale(value)`     | `(value: FlexGap) => boolean`           | 判断走属性还是内联声明                       |
| `getFlexAttrs(config)`      | `(FlexConfig) => FlexDataAttrs`         | 容器 `data-*` 钩子                           |
| `getFlexStyles(config)`     | `(FlexConfig) => FlexStyles`            | 容器内联声明，只有任意 `gap` 有值            |
| `getFlexItemAttrs(config)`  | `(FlexItemConfig) => FlexItemDataAttrs` | 单项 `data-align-self`                       |
| `getFlexItemStyles(config)` | `(FlexItemConfig) => FlexItemStyles`    | 单项内联声明，顺序为 `flex` → 长写           |

Flex 没有状态机，也没有 headless 层：它的状态就是消费者传入的一组静态布局值，渲染后不再变化，既没有需要集中约束的状态组合，也没有响应式桥接、生命周期或 DOM 副作用需要适配，因此 `useFlex` 只会是一个包着 `computed` 的空壳。`ui` 层直接调用 primitives 的纯函数，这与 `ui/types.ts` 已经引用 `@agile-plus/primitives/tabs` 类型是同一条依赖方向。

## 样式钩子

```text
.y-flex                              容器，display: flex
.y-flex[data-inline]                 inline-flex
.y-flex[data-direction='*']          主轴方向
.y-flex[data-align='*']              交叉轴对齐
.y-flex[data-justify='*']            主轴分布
.y-flex[data-wrap='*']               换行
.y-flex[data-gap='xs|sm|md|lg|xl']   档位间距
.y-flex-item[data-align-self='*']    单项交叉轴对齐
```

组件级 CSS Variables：`--y-flex-gap-xs`、`--y-flex-gap-sm`、`--y-flex-gap-md`、`--y-flex-gap-lg`、`--y-flex-gap-xl`。只有间距需要变量隔离，`flex-direction` 一类由 CSS 规范定义、不随主题变化的声明不再包一层变量。

## 与 Radix / Ark 的差异

以下差异是明确取舍，不是遗漏：

| 项目       | Radix Themes / Ark UI                                        | 本库                                                                                                   |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| 参照来源   | Radix Themes 只有 `Flex`，没有 Item；`Flex.Item` 来自 Ark UI | 容器 props 用 Radix Themes 词汇，单项 props 用 Ark UI 词汇                                             |
| `gap` 档位 | Radix Themes 用 spacing `1`–`9` 与 `auto`                    | 本库 Design Token 是语义命名，改为 `xs`–`xl`；不新增数字档位 Token，避免为一个组件改动共享间距体系     |
| `inline`   | Radix Themes 由 `Box` 的 `display` 承担                      | 采用 Ark UI 的 `inline` 布尔，`Flex` 不引入 `Box` 概念                                                 |
| `as`       | Reka `Primitive.as` 可传组件                                 | 只接受原生标签名；换成组件由 `asChild` 覆盖，两条路径不重叠，也省掉标签与组件两套校验                  |
| 布局值落点 | Radix Themes 走 class（codestyle），Ark 走内联 style         | 有限枚举走 `data-*` 由样式层声明，只有任意值走内联，保证无样式层零 CSS 值                              |
| 命名形式   | `Flex` / `Flex.Item` 命名空间                                | `FlexRoot` / `FlexItem`（无头层）与 `Flex` / `FlexItem`（样式层）平铺导出，沿用本库 Dialog / Tabs 约定 |

## 已知限制

- `Slot` 的属性合并已由 SSR 单测覆盖（class / style / 标量优先级 / 节点过滤 / 多子节点抛错）；事件串联与 `ref` 合并在 SSR 输出中不可见，需要 `jsdom` + `@vue/test-utils` 才能断言，当前仓库尚未具备该测试环境。
- 不实现 Radix 的 `gap="auto"` 语义（由子元素 margin 承担间距）；在本库传入 `auto` 会被当作任意值写成 `gap: auto`。
- `FlexItem` 不感知父容器：它只写自身的声明，脱离 flex 容器使用时声明仍会写入但不会产生预期布局效果。
- 不内置 `dir` / RTL 感知，`row-reverse` 需显式指定；Radix Themes 的 `Flex` 同样不感知。
