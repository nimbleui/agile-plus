<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import SliderDemo from '../.vitepress/components/SliderDemo.vue';
</script>

# Slider 滑块

`role="slider"` 的滑块，对应 Radix Primitives 的 `slider` 包。支持单值、多 thumb 范围、横向/纵向、RTL、反转数值、步长吸附与原生表单提交。

## 基础示例

<Preview description="单值、范围、步长、纵向与禁用；拖动或聚焦 thumb 后使用方向键都能看到值实时变化。">
  <SliderDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Slider } from '@agile-plus/components/slider';

const volume = ref([40]);
const price = ref([25, 75]);
</script>

<template>
  <Slider v-model:value="volume" :thumb-labels="['音量']" />

  <Slider
    v-model:value="price"
    :min-steps-between-thumbs="1"
    :thumb-labels="['最低价', '最高价']"
  />
</template>
```

## SliderRoot

### Props

| 属性                    | 类型                         | 默认值         | 说明                                        |
| ----------------------- | ---------------------------- | -------------- | ------------------------------------------- |
| `value`                 | `number[]`                   | `undefined`    | 受控值集合，传入后进入受控模式              |
| `defaultValue`          | `number[]`                   | `[min]`        | 非受控初始值集合                            |
| `min`                   | `number`                     | `0`            | 数值下限                                    |
| `max`                   | `number`                     | `100`          | 数值上限，必须大于 `min`                    |
| `step`                  | `number`                     | `1`            | 步长，必须大于 0                            |
| `minStepsBetweenThumbs` | `number`                     | `0`            | 相邻 thumb 至少保留的步数                   |
| `preserveThumbOrder`    | `boolean`                    | `false`        | 禁止 thumb 交叉；关闭时值排序后允许视觉互换 |
| `orientation`           | `'horizontal' \| 'vertical'` | `'horizontal'` | 滑块朝向                                    |
| `dir`                   | `'ltr' \| 'rtl'`             | `'ltr'`        | 文本方向，影响横向起点与左右方向键          |
| `inverted`              | `boolean`                    | `false`        | 反转数值方向                                |
| `disabled`              | `boolean`                    | `false`        | 禁用全部交互                                |
| `name`                  | `string`                     | `undefined`    | 表单字段名；多 thumb 自动提交为 `name[]`    |
| `form`                  | `string`                     | `undefined`    | 显式关联的表单 id                           |
| `as`                    | `string`                     | `'span'`       | 渲染的目标标签名                            |
| `asChild`               | `boolean`                    | `false`        | 用唯一子元素替换根节点                      |

### Events

| 事件           | 参数              | 说明                                   |
| -------------- | ----------------- | -------------------------------------- |
| `update:value` | `value: number[]` | 每次有效变化触发，配合 `v-model:value` |
| `value-commit` | `value: number[]` | 指针释放或键盘操作完成时触发一次       |

## SliderThumb

### Props

| 属性      | 类型      | 默认值   | 说明                                        |
| --------- | --------- | -------- | ------------------------------------------- |
| `index`   | `number`  | `0`      | thumb 在值集合中的下标，必须稳定且从 0 开始 |
| `as`      | `string`  | `'span'` | 渲染的目标标签名                            |
| `asChild` | `boolean` | `false`  | 用唯一子元素替换 thumb 本体                 |

单个 thumb 需要 `aria-label` 或 `aria-labelledby`；两个及以上 thumb 未提供标签时，会自动得到“最小值 / 最大值”或多值序号。带样式层的 `Slider` 可直接用 `thumb-labels` 传入标签数组。

## SliderTrack / SliderRange

`SliderTrack` 是轨道，`SliderRange` 是已填充区间，二者都支持 `as` / `asChild`。单 thumb 的区间从最小值画到 thumb；多 thumb 从最小 thumb 画到最大 thumb。

## 键盘与可访问性

每个 thumb 是一个 `role="slider"` 的 Tab 停靠点，输出 `aria-valuemin`、`aria-valuemax`、`aria-valuenow` 与 `aria-orientation`。

| 按键                      | 行为                                             |
| ------------------------- | ------------------------------------------------ |
| `ArrowRight` / `ArrowUp`  | 增加一个步长；RTL 或 `inverted` 时按视觉方向翻转 |
| `ArrowLeft` / `ArrowDown` | 减少一个步长                                     |
| `Shift + 方向键`          | 一次移动 10 个步长                               |
| `PageUp` / `PageDown`     | 增加 / 减少 10 个步长                            |
| `Home`                    | 第一个 thumb 移到 `min`                          |
| `End`                     | 最后一个 thumb 移到 `max`                        |

多点触控与鼠标拖拽都通过 window 上的指针监听完成，指针移出滑块后仍能继续拖动。所有可交互元素禁用后退出 Tab 序列。

## 表单集成

提供 `name` 后，每个 thumb 会渲染一个 `display:none` 的文本 input：

- 单 thumb：提交 `name=值`；
- 多 thumb：字段名自动变成 `name[]`，FormData 得到多个同名条目；
- `form` 可把 input 显式关联到页面上的某个表单。

```vue
<form>
  <Slider name="price" :default-value="[25, 75]" :thumb-labels="['最低价', '最高价']" />
</form>
```

## 样式与定位

UI 层会给 thumb 写入绝对定位、主轴百分比位置、`transform: translateX/translateY(-50%)` 和基于真实 thumb 尺寸的贴边偏移，保证 thumb 在 0% / 100% 时不会溢出轨道。带样式层已把 Root 设为 `position: relative`，并用 margin 完成交叉轴居中。

直接使用 UI 层时：

- Root 必须是 `position: relative`；
- Track 必须有确定的长度；
- 横向 thumb 需要把交叉轴居中（例如 `top: 50%`），纵向同理设置 `left: 50%`；
- 触摸拖拽需要 Root 设置 `touch-action: none`，否则浏览器会把拖动解释为页面滚动；带样式层已内置。

UI 层输出 `data-part="root | track | range | thumb"`、`data-orientation` 与 `data-disabled`，样式层可以只依赖这些钩子。

## 与 Radix 的差异

| 差异              | 本库                               | 说明                                                                 |
| ----------------- | ---------------------------------- | -------------------------------------------------------------------- |
| Thumb 下标        | 显式 `index` prop                  | Radix 通过 Collection 自动推导；显式下标与 Ark UI 一致，结构更可预测 |
| 部件命名          | `SliderRoot` / `SliderTrack` / ... | 与库内其它 `*Root` 命名统一                                          |
| 事件名            | `update:value` / `value-commit`    | 对应 `v-model:value`，替代 `onValueChange` / `onValueCommit`         |
| 默认多 thumb 标签 | 最小值 / 最大值或序号              | Radix 使用英文标签，本库按文档语言输出中文                           |
| 拖拽实现          | window 指针监听                    | 与 ScrollArea 一致，指针移出后仍继续拖拽；不使用 Pointer Capture     |

## 已知限制

- `value` / `defaultValue` 的长度必须与模板中的 thumb 数量一致；本库不做自动补齐。
- 尚未实现表单 `reset()` 后把滑块恢复到初始值。
- 单个 thumb 不会自动生成标签，调用方必须提供 `aria-label` / `aria-labelledby` 或 `thumb-labels`。
