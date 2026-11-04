<script setup>
import FormDemo from '../.vitepress/components/FormDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# Form 表单

字段级的无障碍关联与错误提示，对应 Radix Primitives 的 `form` 包（`Form` / `Field` / `Label` / `Control` / `Message` / `ValidityState` / `Submit` 七个部件）。

**它不实现校验规则引擎。** 校验真源是浏览器自己的 Constraint Validation：`required`、`type`、`pattern`、`minlength`、`min`/`max`、`step` 由浏览器判定，组件读取 `ValidityState` 后决定属性与文案；额外的规则通过函数式 `match` 表达。

## 基础示例

<Preview description="四段字段：邮箱（内置 + 函数式规则）、密码、确认密码（跨字段比较）、可留空的主页。提交被拦下时焦点落到第一个无效控件；可以点「模拟服务端拒绝」看 serverInvalid 的效果。">
  <FormDemo />
</Preview>

```vue
<script setup lang="ts">
import {
  FormField,
  FormFieldControl,
  FormFieldLabel,
  FormFieldMessage,
  FormRoot,
  FormSubmit,
} from '@agile-plus/ui/form';
</script>

<template>
  <FormRoot @submit.prevent="onSubmit">
    <FormField name="email">
      <FormFieldLabel>邮箱</FormFieldLabel>

      <FormFieldControl type="email" required />

      <FormFieldMessage match="valueMissing">请填写邮箱</FormFieldMessage>
      <FormFieldMessage match="typeMismatch">邮箱格式不正确</FormFieldMessage>
    </FormField>

    <FormSubmit>提交</FormSubmit>
  </FormRoot>
</template>
```

## 部件

| 部件                     | 渲染                     | 职责                                                          |
| ------------------------ | ------------------------ | ------------------------------------------------------------- |
| `FormRoot`               | `<form>`                 | 持有字段校验注册表；接住冒泡的 `invalid` 并处理焦点与原生气泡 |
| `FormField`              | `<div>`                  | 给这一组控件一个共用 id，并把字段状态摊到外层元素上           |
| `FormFieldLabel`         | `<label>`                | `for` 自动取 Field 的 id；同步 `data-valid` / `data-invalid`  |
| `FormFieldControl`       | `<input>`                | 校验执行者：读 `validity`、跑匹配器、写 `setCustomValidity`   |
| `FormFieldMessage`       | `<span>` 或不存在        | 按条件显示一条文案，并把 id 挂进控件的 `aria-describedby`     |
| `FormFieldValidityState` | 不渲染元素               | 把原始校验状态交给插槽                                        |
| `FormSubmit`             | `<button type="submit">` | 只负责提交，不接管校验、不自行禁用                            |

### FormRoot Props

| 属性                  | 类型         | 默认值      | 说明                                                  |
| --------------------- | ------------ | ----------- | ----------------------------------------------------- |
| `onClearServerErrors` | `() => void` | `undefined` | 表单提交或 reset 时触发，用于清掉外部的服务端错误状态 |
| `as`                  | `string`     | `'form'`    | 渲染的目标标签名                                      |
| `asChild`             | `boolean`    | `false`     | 不渲染自身容器，把属性与事件合并到唯一的子元素上      |

### FormField Props

| 属性             | 类型      | 默认值      | 说明                                     |
| ---------------- | --------- | ----------- | ---------------------------------------- |
| `name`           | `string`  | 必填        | 字段名，同时是控件的 `name` 与注册表的键 |
| `serverInvalid`  | `boolean` | `false`     | 服务端判定该字段无效                     |
| `id`             | `string`  | `undefined` | 控件 id，缺省自动生成                    |
| `as` / `asChild` | —         | —           | 同上                                     |

插槽参数：`{ validity, serverInvalid }`。

### FormFieldControl Props

| 属性      | 类型      | 默认值      | 说明                                                       |
| --------- | --------- | ----------- | ---------------------------------------------------------- |
| `name`    | `string`  | `undefined` | 脱离 Field 时必填；在 Field 内可省略                       |
| `id`      | `string`  | `undefined` | 同上，Label 的 `for` 与它同源                              |
| `as`      | `string`  | `'input'`   | 目标标签名，必须是带约束校验 API 的元素                    |
| `asChild` | `boolean` | `false`     | 替换渲染目标，子元素必须是 `input` / `textarea` / `select` |

其余属性（`type`、`required`、`pattern`、`minlength`、`placeholder` 等）原样透传给原生控件——它们是校验规则的来源，组件不接管。

### FormFieldMessage Props

| 属性         | 类型                               | 默认值      | 说明                                                  |
| ------------ | ---------------------------------- | ----------- | ----------------------------------------------------- |
| `match`      | `ValidityMatcher \| CustomMatcher` | `undefined` | 不传=只要渲染就显示；字符串=内置状态；函数=自定义匹配 |
| `forceMatch` | `boolean`                          | `false`     | 无条件命中，只用于需要常驻 DOM 的进出场动画           |
| `name`       | `string`                           | `undefined` | 脱离 Field 时必填                                     |
| `as`         | `string`                           | `'span'`    | 目标标签名                                            |
| `asChild`    | `boolean`                          | `false`     | 替换渲染目标                                          |

`match` 只接受「值」或 `Ref`，不接受 getter：函数本身就是合法取值，`toValue` 会把它当成 getter 先调用一次。

内置 `match` 取值：`badInput`、`patternMismatch`、`rangeOverflow`、`rangeUnderflow`、`stepMismatch`、`tooLong`、`tooShort`、`typeMismatch`、`valid`、`valueMissing`。不写插槽内容时用英文原文兜底（与 Radix 一致，本库不猜语言）。

## 校验是怎么跑的

```text
用户改值            → 清掉上一轮判定（不重判，输入过程中不挂着过时的错误）
控件 change（失焦） → 读 validity
                       ├─ 有内置错误 → 写入注册表，结束（自定义规则不跑）
                       └─ 无内置错误 → 跑同步自定义规则
                                        ├─ 命中 → setCustomValidity + 写结果
                                        └─ 全过 → 跑异步自定义规则 → 同上
提交                → 浏览器自己拦下无效表单；invalid 冒泡到 FormRoot
                       ├─ 焦点落到第一个无效控件
                       └─ preventDefault 关掉系统气泡
表单 reset          → 撤销自定义错误并清空判定
```

三步顺序都有理由：原生已经不合法时再跑自定义规则，会出现两条互相竞争的文案；异步规则通常要发请求，同步错误已能定论时不该白跑；结果通过 `setCustomValidity` 落回原生状态，`form.checkValidity()`、浏览器拦提交、`validity.valid` 三条路径才看到同一件事，组件不需要维护第二套「是否有效」的真值。

## 服务端错误

组件**不保存**服务端错误内容，只接 `FormField` 的 `serverInvalid` 布尔：它打开 `data-invalid` 并给控件加 `aria-invalid`（原生错误不写 `aria-invalid`，浏览器自己会报）。文案由一条不传 `match` 的 `Message` 配合 `v-if` 承担。清除时机是表单提交或 reset，通过 `onClearServerErrors` 回调通知持有错误数据的那一侧。

## 无障碍行为

| 项           | 说明                                                             |
| ------------ | ---------------------------------------------------------------- |
| 标签关联     | Label 的 `for` 与 Control 的 `id` 同源，自动生成                 |
| 错误引用     | 只有**正在显示**的文案 id 进入 `aria-describedby`                |
| 无效声明     | 服务端错误写 `aria-invalid="true"`；原生错误不重复声明           |
| 焦点         | 提交被拦下时自动落到第一个无效控件（也认 `aria-invalid` 的控件） |
| 系统气泡     | `invalid` 上 `preventDefault()` 关掉，避免与自定义文案重复       |
| 悬停提示     | 控件带 `title=""`，抑制浏览器在悬停时显示的原生错误提示          |
| `novalidate` | 不设置。拦下提交的是浏览器，组件不复刻一套提交判定               |

## 为何没有样式层

本库不为 Form 提供 `@agile-plus/components` 版本，理由与 Radix 一致并且更硬：

- 表单字段的视觉（label 位置、控件描边、错误文案排版、栅格跨度）属于**输入控件体系**，而本库还没有 Input / Textarea / Select 组件。先出一套 `y-form-field` 的间距与描边规范，等 Input 落地时必然要推翻。
- Form 本身不产生任何视觉：它只决定「控件的 `data-invalid`」与「文案在不在 DOM 里」。上面 demo 里的样式全部是消费者侧的普通 CSS。

因此本轮交付到 `primitives → headless → ui` 三层。等 Input 组件进来时，再一起定 Field 的布局契约。

## 无头层 API

```ts
import { useCheckbox } from '@agile-plus/headless'; // 控件可以是任意原生可校验元素
import { useForm, useFormControl, useFormField, useFormMessage } from '@agile-plus/headless';

const form = useForm({ onClearServerErrors: () => (errors.value = {}) });

const field = useFormField({ name: 'email', serverInvalid: () => errors.value.email }, form);

const control = useFormControl({ name: 'email', id: field.id.value }, form, field);

const message = useFormMessage({ match: 'valueMissing' }, form, field);

message.matches.value; // 当前是否该显示
control.getAttrs(); // 控件属性表
await control.validate(); // 手动跑一次校验
control.resetValidation(); // 清空判定
```

四个 Composable 都不使用 `inject`：表单注册表与字段实例由调用方显式传入，因此脱离本库的部件也能自行组装（例如把控件换成业务组件）。`Message`、`ValidityState` 可以只给 `name` 而不嵌套在 `FormField` 内，这是注册表放在表单层的意义。

## Primitives 层

```ts
import {
  VALIDITY_MATCHERS,
  getFirstInvalidControl,
  getFieldStateAttrs,
  getMessageMatch,
  hasBuiltInError,
  isAsyncCustomMatcher,
  readValiditySnapshot,
} from '@agile-plus/primitives/form';

getFieldStateAttrs({ validity: { valid: false, valueMissing: true /* … */ } });
// { 'data-invalid': '' }

getMessageMatch({ match: 'valueMissing', validity }); // boolean
getFirstInvalidControl([okInput, badInput]); // 原生 validity 与 aria-invalid 都算无效
```

`@agile-plus/primitives/form` 同时导出隐藏 input 工具（`getHiddenInputAttrs` 等）与这批校验原语：两者都属于「表单原生控件的共享部分」，因此共用一个包路径。

## 与 Radix 的差异

| 项目           | Radix                                                           | 本库                                                                              |
| -------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 命名           | `Form` / `Form.Field` / `Form.Label` / …                        | `FormRoot` / `FormField` / `FormFieldLabel` / …（与库内 `*Root` 统一）            |
| 异步规则识别   | 先看 `constructor.name`，再**试跑一次**函数判断是否返回 Promise | 只认 `async` 声明。试跑会让消费者的规则被多调用一次（可能带副作用或多发一次请求） |
| 提交拦截       | `formIsValid` 由字段状态推导，配合 `onInvalid` 阻止             | 完全交给浏览器：不设置 `novalidate`，不维护第二套有效性                           |
| 函数 prop      | React 天然每次读最新值                                          | `match` 只接受值或 `Ref`（`toValue` 会把函数当 getter 调用）                      |
| `asChild` 语义 | `child` 属性                                                    | `asChild` + 唯一子元素，与其它部件一致                                            |
| 样式层         | 无                                                              | 无，原因见上节                                                                    |

## 已知限制

- 控件必须是原生可校验元素。本库的 Checkbox / Switch 是 `button` 语义：规范上它们也带 `validity`，但 `required`、`pattern` 等约束属性无效，字段会恒判为合法。给这类控件做校验请在外层自己判断，或用函数式 `match` 配合一个隐藏 input。
- 没有 `validationTrigger` / `validationMode`：那是 Reka 的扩展，触发时机固定为原生 `change`。
- 没有表单级 `formIsValid` 汇总状态：Radix 当前版本也没有。需要时遍历各字段的 `getFieldValidity(name)` 即可。
- 文案不做本地化：内置原文是英文，中文一律由消费者写在插槽里。
