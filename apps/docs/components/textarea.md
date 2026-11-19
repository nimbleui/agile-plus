<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import TextareaDemo from '../.vitepress/components/TextareaDemo.vue';
</script>

# Textarea 多行输入

多行文本输入控件。与 [Input](./input) 共用同一个值内核（`useTextControl`）：受控 / 非受控、IME 组合输入、Form 自动注入与 reset 复原的行为完全一致，差异只在渲染目标是 `textarea`、没有 `type` 属性。

## 基础示例

<Preview description="v-model 与换行统计、禁用 / 只读（禁用态不可拖动调整大小）；表单段演示自动注入与 required 校验文案。">
  <TextareaDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Textarea } from '@agile-plus/components/textarea';

const bio = ref('');
</script>

<template>
  <Textarea v-model="bio" :rows="4" placeholder="介绍一下自己" />
</template>
```

## Props

| 属性           | 类型        | 默认值      | 说明                                                       |
| -------------- | ----------- | ----------- | ---------------------------------------------------------- |
| `modelValue`   | `string`    | `undefined` | 受控值，传入后进入受控模式，配合 `v-model` 使用            |
| `defaultValue` | `string`    | `''`        | 非受控初始值，也是 `form.reset()` 要回到的值（创建时捕获） |
| `disabled`     | `boolean`   | `false`     | 禁用，输出原生 `disabled` 与 `data-disabled`               |
| `readOnly`     | `boolean`   | `false`     | 只读：值仍可选中复制，输出原生 `readonly` 与 `data-readonly` |
| `required`     | `boolean`   | `false`     | 必填，输出原生 `required` 与 `aria-required`               |
| `name`         | `string`    | `undefined` | 表单字段名；在 FormField 内可省略                          |
| `id`           | `string`    | `undefined` | 控件 id；在 FormField 内可省略                             |
| `form`         | `string`    | `undefined` | 显式指定所属表单 id                                      |
| `as`           | `string`    | `'textarea'` | 渲染的目标标签名                                          |
| `asChild`      | `boolean`   | `false`     | 不渲染自身，把属性合并到唯一的 textarea 子元素上           |

`rows` / `placeholder` / `maxlength` 等原生属性经 attrs 透传。

## Events

| 事件                | 参数            | 说明                                                             |
| ------------------- | --------------- | ---------------------------------------------------------------- |
| `update:modelValue` | `value: string` | 值变化时触发，配合 `v-model`；IME 组合期间不触发，结束后一次性触发 |
| `change`            | `event: Event`  | 失焦确认时触发，携带原始事件                                     |

## DOM 输出

| 属性               | 说明                                                  |
| ------------------ | ----------------------------------------------------- |
| `data-part`        | `textarea`                                            |
| `data-disabled`    | 禁用时存在                                            |
| `data-readonly`    | 只读时存在                                            |
| `aria-required`    | 仅必填时输出                                          |
| `data-invalid`     | 在 Form 内且当前判定无效时存在                        |
| `aria-describedby` | 在 Form 内自动合并正在显示的错误文案 id               |

## Form 自动注入与值语义

与 Input 完全一致，见 [Input 的 Form 自动注入](./input#form-自动注入)与[值语义](./input#值语义)两节：同一个 `useFormControl`、同一条受控判定、同一套 IME 与 reset 约定，这里不重复实现。

## 样式层

`.y-textarea` 最小高度约为两档控件高度，`resize: vertical` 允许纵向拖动调整；禁用态关闭 resize。颜色语义与 Input 共用同一组 token（边框 / 悬停 / 聚焦 / 无效 / 禁用）。

## 已知限制

- 不提供自动高度（autoSize）：自动高度需要逐帧测量 scrollHeight，属于性能敏感能力，等有真实需求再按 `references/performance.md` 的约定引入。
- 字数统计（showCount）同属装饰件，用 `v-model` 的值自行组装。