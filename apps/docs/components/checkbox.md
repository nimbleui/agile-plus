<script setup>
import CheckboxDemo from '../.vitepress/components/CheckboxDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# Checkbox 复选框

三态复选框与多选组。行为对齐 Radix 的 `Checkbox.Root` / `Checkbox.Indicator`，多选组对齐 Radix Themes 的 `CheckboxGroup.Root`。

关于出处需要先说明：**Radix Primitives 与 Reka UI 都没有 CheckboxGroup**，只有 `Checkbox`；`CheckboxGroup.Root` + `Checkbox.GroupItem` 来自 **Radix Themes**，语义是「组持有一个值数组」。本库按这一语义实现。

## 基础示例

<Preview description="第一行演示 v-model:checked；第二行的半选点击后收敛为选中；组内的勾选状态由值数组派生，全选框的三态由子项数量推导。">
  <CheckboxDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Checkbox } from '@agile-plus/components/checkbox';

const agree = ref(false);
</script>

<template>
  <label class="row">
    <Checkbox v-model:checked="agree" name="agree" />
    <span>同意条款和条件</span>
  </label>
</template>
```

结构与 Radix 一致：**触发元素本身就是那个方框**，Indicator 是框内的勾或横线；可见文本放在组件外部，由 `label` 包裹或 `for` / `id` 关联，本库不内置 label 子组件。

## Checkbox

### Props

| 属性             | 类型                         | 默认值      | 说明                                                     |
| ---------------- | ---------------------------- | ----------- | -------------------------------------------------------- |
| `checked`        | `boolean \| 'indeterminate'` | `undefined` | 受控状态，传入后进入受控模式                             |
| `defaultChecked` | `boolean \| 'indeterminate'` | `false`     | 非受控初始状态                                           |
| `disabled`       | `boolean`                    | `false`     | 禁用，落到原生 `disabled` 与 `data-disabled`             |
| `required`       | `boolean`                    | `false`     | 必选，输出 `aria-required` 与 input 的 `required`        |
| `name`           | `string`                     | `undefined` | 表单字段名；未提供时 input 不带 `name`，但仍参与校验     |
| `value`          | `string`                     | `'on'`      | 提交值；在组内时是「该项在数组中的标识」，必须显式且唯一 |
| `id`             | `string`                     | `undefined` | 供 label 的 `for` 关联                                   |
| `as`             | `string`                     | `'button'`  | 渲染的目标标签名                                         |
| `asChild`        | `boolean`                    | `false`     | 不渲染按钮，把属性与事件合并到唯一子元素                 |

### Events

| 事件             | 参数                                | 说明                        |
| ---------------- | ----------------------------------- | --------------------------- |
| `update:checked` | `value: boolean \| 'indeterminate'` | 配合 `v-model:checked` 使用 |

在组内时不触发 `update:checked`：勾选状态唯一的写入路径是组的值数组，避免出现两个都能改状态的真源。

### 受控与非受控

不绑定 `v-model:checked` 时组件自己维护状态，这是文档示例里第三行的用法：

```vue
<template>
  <label>
    <Checkbox />
    <span>记住登录状态</span>
  </label>
</template>
```

受控属性必须以「未提供」为前提才能识别出非受控模式，而 Vue 对 Boolean prop 会把缺失转成 `false`。因此 `CheckboxRoot` 用运行时 props 声明并显式写 `default: undefined`；改回 `withDefaults(defineProps<T>(), …)` 的类型写法，症状是**所有非受控复选框都点不动**，且构建与类型检查都不会报错。同一个缺陷也存在于 `DialogRoot` 的 `open`，详见[分层架构](/guide/architecture)里的 Boolean prop 陷阱一节。

## 三态与半选

```ts
type CheckboxCheckedState = boolean | 'indeterminate';
```

| 状态              | `aria-checked` | `data-state`    | Indicator 是否挂载 |
| ----------------- | -------------- | --------------- | ------------------ |
| `true`            | `true`         | `checked`       | 是                 |
| `false`           | `false`        | `unchecked`     | 否                 |
| `'indeterminate'` | `mixed`        | `indeterminate` | 是                 |

半选的三个必要事实：

- **`aria-checked` 必须是 `mixed`**：写成 `false` 会让辅助技术把「部分选中」播报成「未选中」。
- **`indeterminate` 是 DOM property 而不是 attribute**：`v-bind` 写进模板不会生效，必须在元素引用上赋值。UI 层用 `watchEffect` 同步 `input.indeterminate`。
- **点击半选得到选中，而不是取消**：半选是父级由子项推导的中间态，不是用户可以主动选择的终态，第一次交互总是把它明确化（`resolveNextChecked`）。

半选通常由子项推导，本库把推导函数放在 primitives，全选写法因此只有三行：

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';

import { resolveIndeterminate } from '@agile-plus/primitives/checkbox';
import { Checkbox } from '@agile-plus/components/checkbox';

const options = ['vue', 'react', 'angular'];
const picked = ref<string[]>(['vue']);

const allState = computed(() => resolveIndeterminate(picked.value.length, options.length));

function setAll(next: boolean | 'indeterminate'): void {
  picked.value = next === true ? [...options] : [];
}
</script>

<template>
  <Checkbox :checked="allState" @update:checked="setAll" />
</template>
```

## CheckboxIndicator

语义对齐 Radix：只在 `checked` 或 `indeterminate` 时挂载，未选中时 DOM 里没有这个节点。

| 属性         | 类型      | 默认值  | 说明                                               |
| ------------ | --------- | ------- | -------------------------------------------------- |
| `forceMount` | `boolean` | `false` | 未选中时也保留元素，用 `data-state` 做进出两段动画 |
| `as`         | `string`  | `span`  | 渲染的目标标签名                                   |
| `asChild`    | `boolean` | `false` | 不渲染自身容器，把属性合并到唯一子元素             |

输出 `aria-hidden="true"`、`data-part="indicator"` 与 `data-state`（复用 primitives 的三态映射，不再写第四份对应关系）。它必须写在 `CheckboxRoot` 内部。

## CheckboxGroup

多选组，语义对齐 Radix Themes：组持有 `string[]`，组内每项用 `value` 在数组中取得勾选状态。

### Props

| 属性              | 类型       | 默认值      | 说明                                        |
| ----------------- | ---------- | ----------- | ------------------------------------------- |
| `modelValue`      | `string[]` | `undefined` | 受控值集合，传入后进入受控模式              |
| `defaultValue`    | `string[]` | `[]`        | 非受控初始集合                              |
| `disabled`        | `boolean`  | `false`     | 整组禁用，会传播到每一项                    |
| `required`        | `boolean`  | `false`     | 只输出 `aria-required`，**不下发给单项**    |
| `name`            | `string`   | `undefined` | 每项的隐藏 input 共用它，提交时得到同名多值 |
| `ariaLabelledby`  | `string`   | `undefined` | 组标题元素 id                               |
| `ariaDescribedby` | `string`   | `undefined` | 组说明元素 id                               |
| `as`              | `string`   | `div`       | 渲染的目标标签名                            |

### Events

| 事件                | 参数               | 说明                |
| ------------------- | ------------------ | ------------------- |
| `update:modelValue` | `values: string[]` | 配合 `v-model` 使用 |

```vue
<template>
  <CheckboxGroup v-model="picked" name="picked" aria-labelledby="fw-label">
    <p id="fw-label">前端框架</p>

    <label v-for="option in options" :key="option">
      <Checkbox :value="option" />
      <span>{{ option }}</span>
    </label>
  </CheckboxGroup>
</template>
```

组内不需要单独的 `GroupItem` 组件：`Checkbox` 自己检测是否处于组上下文中，并在组内时把状态来源切到数组。这与 Radix Themes 的 `Checkbox.GroupItem` 是等价的，只是少一个组件名。

**组内必须给每项提供唯一 `value`**，否则多项会共用默认的 `'on'`、勾选互相覆盖；这种情况直接抛错而不是静默产生错乱数据。

`required` 不下发给单项是刻意的：单项 `required` 表示「这一项必须勾选」，与「组内至少选一个」是两种不同约束，混用会产生互相矛盾的校验语义。

## 隐藏 input 与表单提交

与 Switch 共用同一套 bubble input 接线（`@agile-plus/primitives/form` + `useBubbleInput`），差别只在写进原生控件的是「是否选中」这个布尔：

- input 是触发按钮的**兄弟节点**并排在它之后——`<button>` 内不允许出现交互元素——靠内联样式按按钮实测尺寸覆盖其上，`translateX(-100%)` 把它拉回按钮位置。
- 渲染条件只看「控件是否在 `<form>` 内」（元素尚未挂载时按是处理），**不再看有没有 `name`**：没有 name 时原生 checkbox 依然参与 `required` 校验，只是不贡献提交值。
- `checked` 不走 attribute：由 `HTMLInputElement.prototype` 上的原始 setter 写入真实状态，再派发一次冒泡 `change`，因此 `FormData`、`form.addEventListener('change')` 与依赖 change 的表单库都能看到；初次挂载只写值不派发。
- `form.reset()` 会把状态恢复到控件初次出现时的值，与浏览器给 input 的 `defaultChecked` 快照同源。
- 组提供 `name` 时，组内每一项的 input 共用该 `name` 且 `value` 各不同，提交得到 `picked=vue&picked=react` 这样的同名多值；组容器上不生成 input，避免出现第二个提交源。
- 约束与 RadioGroup 相同：`tabindex="-1"` 移出焦点序、`pointer-events: none` 让点击只落在触发元素、`aria-hidden="true"` 不进无障碍树、禁用项输出原生 `disabled` 由浏览器忽略提交。

覆盖位置在 flex 行容器里会偏到控件左侧一个自身宽度（不产生滚动溢出，也不影响提交与校验），实测数据与原因见 [Switch 的「覆盖位置不是像素级精确」](/components/switch#覆盖位置不是像素级精确-实测)。

## 无样式层用法

```vue
<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from '@agile-plus/ui/checkbox';
</script>

<template>
  <CheckboxRoot v-model:checked="checked" class="my-checkbox">
    <CheckboxIndicator class="my-indicator">
      <svg width="10" height="10" viewBox="0 0 12 12">
        <path d="M2.5 6.3 4.7 8.5 9.5 3.6" stroke="currentColor" fill="none" />
      </svg>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
```

`CheckboxRoot` 支持 `as` 换标签与 `asChild` 替换渲染目标。`asChild` 只替换触发按钮，隐藏 input 仍由本组件另外渲染——这一点与 Radix 不同：Radix 把 input 连同 children 一起交给 Slot，而 Slot 只取第一个子元素，实际会丢掉这个隐藏控件。本库把 input 放在 Slot 之外，因此替换后表单能力不会静默消失。

## useCheckbox

```ts
import { useCheckbox } from '@agile-plus/headless';

const { checked, getRootProps, getInputProps, isIndicatorPresent, toggle } = useCheckbox({
  defaultChecked: 'indeterminate',
});
```

| 返回值                  | 类型                                   | 说明                                           |
| ----------------------- | -------------------------------------- | ---------------------------------------------- |
| `checked`               | `ComputedRef<CheckboxCheckedState>`    | 当前三态                                       |
| `isDisabled`            | `ComputedRef<boolean>`                 | 是否禁用                                       |
| `isFormControl`         | `ComputedRef<boolean>`                 | 是否应渲染隐藏 input（控件是否在表单内）       |
| `isIndicatorPresent`    | `ComputedRef<boolean>`                 | Indicator 是否应存在（选中或半选）             |
| `control`               | `Ref<HTMLElement \| null>`             | 触发元素，尺寸跟随与表单归属判定都靠它         |
| `setControl(node)`      | `(node: unknown) => void`              | 传给模板的 `:ref`                              |
| `inputElement`          | `Ref<HTMLInputElement \| null>`        | 隐藏 input 元素，`indeterminate` 在这里赋值    |
| `setInputElement(node)` | `(node: unknown) => void`              | 传给 input 的 `:ref`                           |
| `setChecked(next)`      | `(next: CheckboxCheckedState) => void` | 直接设置状态，父级推导半选时使用               |
| `toggle()`              | `() => void`                           | 按点击语义切换，禁用时不变化                   |
| `getRootProps()`        | `Record<string, unknown>`              | 触发元素的属性                                 |
| `getInputProps()`       | `Record<string, unknown> \| null`      | 隐藏 input 属性与内联样式，非表单控件时为 null |
| `onRootClick()`         | `() => void`                           | 绑定到 `@click`                                |

## useCheckboxGroup

| 返回值                        | 类型                                                     | 说明                          |
| ----------------------------- | -------------------------------------------------------- | ----------------------------- |
| `values`                      | `ComputedRef<string[]>`                                  | 当前选中值集合                |
| `isDisabled`                  | `ComputedRef<boolean>`                                   | 整组是否禁用                  |
| `name`                        | `ComputedRef<string \| undefined>`                       | 组级字段名，由各项 input 共用 |
| `setValues(next)`             | `(next: string[]) => void`                               | 替换整个集合                  |
| `setItemChecked(value, next)` | `(value: string, checked: CheckboxCheckedState) => void` | 勾选或取消某一项              |
| `isValueChecked(value)`       | `(value: string) => boolean`                             | 该项是否已勾选                |
| `getRootProps()`              | `Record<string, unknown>`                                | 组容器属性（`role="group"`）  |

组不维护注册表：勾选状态是「值是否在数组里」的派生结果，项的顺序与禁用态由各 Item 自己持有。隐藏 input 也交给各项自己渲染，组只下发 `name`，因此不再提供 `getInputProps`。

## Primitives 层

```ts
import {
  getCheckboxAttrs,
  isCheckboxIndicatorPresent,
  isGroupValueChecked,
  resolveIndeterminate,
  resolveNextChecked,
  toggleGroupValue,
} from '@agile-plus/primitives/checkbox';
```

| 函数                                                | 作用                                                         |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `getCheckboxAttrs({ checked, disabled, required })` | 三态 → `aria-checked` / `data-state`，未提供的布尔不产出属性 |
| `resolveNextChecked(current)`                       | 点击后应进入的状态，半选收敛为 `true`                        |
| `isCheckboxIndicatorPresent(checked)`               | Indicator 挂载判断                                           |
| `toggleGroupValue(values, value, checked)`          | 返回新的值集合，不修改入参                                   |
| `isGroupValueChecked(values, value)`                | 集合判断                                                     |
| `resolveIndeterminate(checkedCount, totalCount)`    | 全选框三态推导，空集合返回 `false`                           |

全部为纯函数，可在 node 环境独立测试，对应单测见 `packages/primitives/__tests__/checkbox.test.ts`。

## 无障碍行为

| 项         | 实现                                                          |
| ---------- | ------------------------------------------------------------- |
| 角色       | 触发元素 `role="checkbox"`，组容器 `role="group"`             |
| 状态       | `aria-checked`，半选为 `mixed`                                |
| 禁用       | 触发元素原生 `disabled` + `data-disabled`；组级禁用传播到各项 |
| 必选       | `aria-required`，组的 `required` 不下发给单项                 |
| 名称       | 由 `label` 包裹或 `for` / `id` 关联，本库不内置 Label 组件    |
| 键盘       | 原生 button 行为，Space / Enter 触发切换，无需额外键位        |
| Indicator  | `aria-hidden="true"`，选中语义只由 `aria-checked` 表达        |
| 隐藏 input | `aria-hidden="true"` + `tabindex="-1"`，不进无障碍树与焦点序  |

## 样式钩子

```text
.y-checkbox                          触发元素（方框本体）
.y-checkbox[data-state='checked']      选中
.y-checkbox[data-state='indeterminate'] 半选
.y-checkbox[data-disabled]             禁用
.y-checkbox__indicator               勾或横线的容器（仅选中/半选时存在）
.y-checkbox__indicator[data-state]   二选一显示 [data-part='check'] 与 [data-part='dash']
.y-checkbox-group                    组容器
```

勾与横线由 Indicator 自己的 `data-state` 决定显示哪一个，两者都带 `data-part` 标记，因此不需要把完整 class 名硬写进复合选择器。

组件级变量：`--y-checkbox-size`、`--y-checkbox-radius`、`--y-checkbox-border`、`--y-checkbox-border-hover`、`--y-checkbox-border-checked`、`--y-checkbox-bg`、`--y-checkbox-bg-checked`、`--y-checkbox-bg-disabled`、`--y-checkbox-color-on-checked`、`--y-checkbox-dash-width`、`--y-checkbox-dash-height`；状态层为 `--y-checkbox-state-border` 与 `--y-checkbox-state-bg`。

## 与 Radix 的差异

| 项目              | Radix                                                                                 | 本库                                                                          |
| ----------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `CheckboxGroup`   | Primitives 无此组件，只有 Radix Themes 的 `CheckboxGroup.Root` + `Checkbox.GroupItem` | 按 Themes 的值数组语义实现；组内不需要 GroupItem，`Checkbox` 自身检测组上下文 |
| Root 的 `asChild` | 文档提供，但隐藏 input 会作为第二个子节点被 Slot 丢弃                                 | 支持：input 由组件另外渲染，替换触发元素不会丢表单能力                        |
| 隐藏 input 的事件 | 派发冒泡 `click`，靠「用户点击 / 程序化更新」两套记账避免祖先 onClick 重复触发        | 直接派发原生 `change`，一次变化一次事件，不需要那套记账                       |
| 全选              | 无内置 API，需自行推导                                                                | 同样不内置，提供 `resolveIndeterminate` 纯函数                                |
| Indicator 退场    | `Presence` 等动画结束再卸载                                                           | 卸载即时，需要退场动画用 `forceMount`                                         |

## 已知限制

- `defaultIndeterminate` 未单独提供：用 `defaultChecked: 'indeterminate'` 表达，避免两个字段之间出现「既默认选中又默认半选」的矛盾输入。
- 组不提供「至少选一项」的表单校验原语：`required` 只输出 `aria-required`，实际校验属于表单层职责。
- 组内项的顺序不参与任何逻辑（没有键盘导航），因此也没有注册表。
