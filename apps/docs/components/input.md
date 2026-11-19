<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import InputDemo from '../.vitepress/components/InputDemo.vue';
</script>

# Input 输入框

单行文本输入控件。值管理（受控 / 非受控）、中文输入法组合输入与表单 reset 复原在无头层 `useInput` 里实现；放进 `FormRoot` 时自动接上 Form 的校验注册表，与 `FormFieldControl` 复用同一个 `useFormControl`，校验逻辑没有第二份。

## 基础示例

<Preview description="v-model、三档尺寸、禁用 / 只读、password 类型；表单段演示自动注入（Input 没写 name / id）、required 与 type 校验文案、输入即清判定、reset 复原。">
  <InputDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Input } from '@agile-plus/components/input';

const keyword = ref('');
</script>

<template>
  <Input v-model="keyword" placeholder="搜索" />
</template>
```

## Props

| 属性           | 类型                            | 默认值      | 说明                                                                 |
| -------------- | ------------------------------- | ----------- | -------------------------------------------------------------------- |
| `modelValue`   | `string`                        | `undefined` | 受控值，传入后进入受控模式，配合 `v-model` 使用                      |
| `defaultValue` | `string`                        | `''`        | 非受控初始值，也是 `form.reset()` 要回到的值（创建时捕获）           |
| `type`         | `string`                        | `'text'`    | 原生 input 的 type，不做词表限制，校验规则随 type 变化               |
| `size`         | `'small' \| 'middle' \| 'large'` | `'middle'`  | 尺寸变体，只影响样式层，不透传给原生 input                           |
| `disabled`     | `boolean`                       | `false`     | 禁用，输出原生 `disabled` 与 `data-disabled`                         |
| `readOnly`     | `boolean`                       | `false`     | 只读：值仍可选中复制，输出原生 `readonly` 与 `data-readonly`         |
| `required`     | `boolean`                       | `false`     | 必填，输出原生 `required` 与 `aria-required`，参与原生校验           |
| `name`         | `string`                        | `undefined` | 表单字段名；在 FormField 内可省略（复用 Field 的 name）              |
| `id`           | `string`                        | `undefined` | 控件 id；在 FormField 内可省略（复用 Field 生成的 id）               |
| `form`         | `string`                        | `undefined` | 显式指定所属表单 id，用于控件放在 `<form>` 外部的场景                |
| `as`           | `string`                        | `'input'`   | 渲染的目标标签名                                                     |
| `asChild`      | `boolean`                       | `false`     | 不渲染自身，把属性合并到唯一的 input 子元素上                        |

`placeholder` / `maxlength` / `pattern` / `autocomplete` 等原生属性经 attrs 透传，不在 props 表里重复声明。

## Events

| 事件                | 参数            | 说明                                                             |
| ------------------- | --------------- | ---------------------------------------------------------------- |
| `update:modelValue` | `value: string` | 值变化时触发，配合 `v-model`；IME 组合期间不触发，结束后一次性触发 |
| `change`            | `event: Event`  | 原生 change 语义：失焦或回车确认时触发，携带原始事件             |

## DOM 输出

| 属性             | 说明                                                       |
| ---------------- | ---------------------------------------------------------- |
| `data-part`      | `input`                                                    |
| `data-disabled`  | 禁用时存在                                                 |
| `data-readonly`  | 只读时存在                                                 |
| `aria-required`  | 仅必填时输出                                               |
| `data-invalid`   | 在 Form 内且当前判定无效时存在（来自 useFormControl）      |
| `aria-describedby` | 在 Form 内自动合并正在显示的错误文案 id                  |
| `title`          | 在 Form 内输出空串，关掉浏览器悬停原生错误提示             |

## Form 自动注入

放进 `FormRoot` 后，Input 在 setup 期注入 `form` / `formField` 上下文并创建 `useFormControl` 实例：

- 在 `FormField` 内可省略 `name` / `id`，label 的 `for` 与错误文案的 `aria-describedby` 自动关联。
- 原生 `invalid` 冒泡到 FormRoot 后触发字段校验，判定结果落在控件的 `data-invalid` 上；用户重新输入时立即清掉上一轮判定。
- 在 `FormRoot` 内但不在 `FormField` 内、又没给 `name` 时直接抛错——这是用法错误，静默会让校验永远不生效。
- 脱离 Form 独立使用时不创建校验实例，`name` 也不是必需的。

## 值语义

- **`undefined` 是「未受控」的唯一判据**：`modelValue` 缺省保持 undefined，组件内部维护值；传入后真源在外部，组件只回调 `update:modelValue`，父级拒绝新值时 DOM 会被拉回受控值，显示与存储不分叉。
- **IME 组合输入**：compositionstart 到 compositionend 之间逐键派发的 input 事件不提交，组合结束后一次性落最终值，避免拼音碎片写进值真源。
- **reset 复原**：监听所属表单的原生 reset，把值恢复到**创建时捕获的初值**；运行期修改 `defaultValue` 不影响复原目标。

## 键盘与可访问性

原生 input 自带焦点与键盘行为；禁用由原生 `disabled` 表达，只读由 `readonly` 表达（仍可聚焦复制）。必填输出 `aria-required`，错误关联走 `aria-describedby`，读屏在聚焦时能读到错误文案。

## 已知限制

- `required` / `type` 的拦截依赖浏览器原生校验；单元测试覆盖「属性与事件是否正确给出」，原生校验气泡的行为需在文档站实测。
- 样式层不提供清除按钮、前后缀插槽等装饰件：这些属于组合需求，用 attrs 与外层布局自行组装，内核不为此增加 API。