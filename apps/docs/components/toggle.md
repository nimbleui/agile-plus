<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import ToggleDemo from '../.vitepress/components/ToggleDemo.vue';
</script>

# Toggle 开关按钮

按下会保持状态的按钮，以及把它组织成一组的 `ToggleGroup`。两者都在 Radix Primitives 里（`packages/react/toggle`、`packages/react/toggle-group`），后者的键盘导航来自 `@radix-ui/react-roving-focus`。

## 基础示例

<Preview description="第一行是独立开关；第二行是单选组（再次点击已选中项会取消，可切换整组禁用 / 罗盘焦点 / 排布方向）；第三行是多选组，其中 U 项单独禁用；第四行是非受控组，只能通过事件读值。">
  <ToggleDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Toggle, ToggleGroup, ToggleGroupItem } from '@agile-plus/components/toggle';

const bold = ref(false);
const align = ref('center');
</script>

<template>
  <Toggle v-model:pressed="bold">加粗</Toggle>

  <ToggleGroup v-model:value="align" type="single" orientation="horizontal" aria-label="对齐方式">
    <ToggleGroupItem value="left">左对齐</ToggleGroupItem>
    <ToggleGroupItem value="center">居中</ToggleGroupItem>
    <ToggleGroupItem value="right">右对齐</ToggleGroupItem>
  </ToggleGroup>
</template>
```

## Toggle

### Props

| 属性             | 类型      | 默认值      | 说明                                         |
| ---------------- | --------- | ----------- | -------------------------------------------- |
| `pressed`        | `boolean` | `undefined` | 受控按下状态，传入后进入受控模式             |
| `defaultPressed` | `boolean` | `false`     | 非受控初始状态                               |
| `disabled`       | `boolean` | `false`     | 禁用，输出原生 `disabled` 与 `data-disabled` |
| `as`             | `string`  | `'button'`  | 渲染的目标标签名                             |
| `asChild`        | `boolean` | `false`     | 用唯一子元素替换按钮本体                     |

### Events

| 事件             | 参数               | 说明                        |
| ---------------- | ------------------ | --------------------------- |
| `update:pressed` | `pressed: boolean` | 配合 `v-model:pressed` 使用 |

### DOM 输出

| 属性            | 说明                                                            |
| --------------- | --------------------------------------------------------------- |
| `type="button"` | 避免在表单里误提交                                              |
| `aria-pressed`  | 始终输出（`true` / `false`），缺席会被读成普通按钮              |
| `data-state`    | `on` / `off`——注意与 Dialog 等组件的 `open` / `closed` 词表不同 |
| `data-disabled` | 禁用时存在                                                      |

触发元素本身就是开关，**没有 Indicator 部件**：这与 Checkbox / Radio 的结构不同，也和 Radix 一致。

## ToggleGroup

### Props

| 属性           | 类型                         | 默认值      | 说明                                                            |
| -------------- | ---------------------------- | ----------- | --------------------------------------------------------------- |
| `type`         | `'single' \| 'multiple'`     | 必填        | 缺失时创建阶段抛错；决定值形状与 ARIA 角色                      |
| `value`        | `string \| string[]`         | `undefined` | 受控值：`single` 是字符串（`''` 表示未选中），`multiple` 是数组 |
| `defaultValue` | `string \| string[]`         | `undefined` | 非受控初始值                                                    |
| `disabled`     | `boolean`                    | `false`     | 整组禁用，项的禁用状态是「组禁用或项禁用」                      |
| `rovingFocus`  | `boolean`                    | `true`      | 罗盘焦点；关闭后每项独立进入 Tab 序列，方向键不接管             |
| `loop`         | `boolean`                    | `true`      | 到达两端后是否绕回                                              |
| `orientation`  | `'horizontal' \| 'vertical'` | `undefined` | 排布方向，决定哪一组方向键有效                                  |
| `dir`          | `'ltr' \| 'rtl'`             | `'ltr'`     | 文本方向，`rtl` 下左右键互换                                    |
| `as`           | `string`                     | `'div'`     | 渲染的目标标签名                                                |
| `asChild`      | `boolean`                    | `false`     | 用唯一子元素替换组容器                                          |

### Events

| 事件           | 参数                 | 说明                                           |
| -------------- | -------------------- | ---------------------------------------------- |
| `update:value` | `string \| string[]` | 负载形状跟随 `type`；配合 `v-model:value` 使用 |

### ToggleGroupItem

| 属性       | 类型      | 默认值     | 说明                     |
| ---------- | --------- | ---------- | ------------------------ |
| `value`    | `string`  | 必填       | 项的值，组内必须唯一     |
| `disabled` | `boolean` | `false`    | 单项禁用                 |
| `as`       | `string`  | `'button'` | 渲染的目标标签名         |
| `asChild`  | `boolean` | `false`    | 用唯一子元素替换按钮本体 |

项上**没有 `pressed`**：状态唯一来源是组的值，避免出现两处真源（Radix 同样如此，它内部渲染一个受控 Toggle）。

### DOM 输出

| 属性                | 位置  | 说明                                                                     |
| ------------------- | ----- | ------------------------------------------------------------------------ |
| `role="radiogroup"` | 组    | `type="single"`                                                          |
| `role="toolbar"`    | 组    | `type="multiple"`                                                        |
| `tabindex="0"`      | 组    | 罗盘模式下整组的唯一停靠点；没有可聚焦项或用户 Shift+Tab 退出时为 `-1`   |
| `dir`               | 组    | 文本方向                                                                 |
| `data-orientation`  | 组/项 | 仅在罗盘模式下输出，与 Radix 一致                                        |
| `role="radio"`      | 项    | `single` 组专属，**同时移除 `aria-pressed`**，避免一个控件上两套状态语义 |
| `aria-checked`      | 项    | `single` 组用它表达选中                                                  |
| `aria-pressed`      | 项    | `multiple` 组保留 Toggle 的按下语义                                      |
| `tabindex`          | 项    | 罗盘模式下只有当前停靠点是 `0`，其余 `-1`（仍可被程序聚焦）              |
| `data-state`        | 项    | `on` / `off`                                                             |

## 罗盘焦点（键盘导航）

整组在 Tab 序列里只占**一格**。焦点第一次进入组时落在选中项上（没有选中项则落在最近一次的停靠点，再没有就第一项），之后用方向键在项之间移动；移动只改焦点，不触发按下。

| 按键                       | 行为                                           |
| -------------------------- | ---------------------------------------------- |
| `Tab`                      | 进入 / 离开整组                                |
| `Shift + Tab`              | 退出整组（组的停靠点临时让出，不会被重新抢回） |
| `ArrowRight` / `ArrowDown` | 下一个可聚焦项                                 |
| `ArrowLeft` / `ArrowUp`    | 上一个可聚焦项                                 |
| `Home` / `PageUp`          | 第一个可聚焦项                                 |
| `End` / `PageDown`         | 最后一个可聚焦项                               |
| `Enter` / `Space`          | 由原生 button 触发按下，改变选中状态           |

三条不接管按键的情况，与 Radix 相同：带 `Ctrl` / `Alt` / `Meta` / `Shift` 的组合键交还浏览器（例如 `Ctrl + Home` 滚动文档）；`orientation="vertical"` 时忽略左右键、`horizontal` 时忽略上下键，避免和页面滚动抢按键；`dir="rtl"` 下左右键互换，让「前/后」跟视觉顺序一致。

`rovingFocus={false}` 时组退化成普通按钮容器：每项各自进 Tab 序列，方向键完全交还浏览器。

## 该用哪个组

| 需求                                   | 选择            | 原因                                                   |
| -------------------------------------- | --------------- | ------------------------------------------------------ |
| 必须始终有一个选中项，且需要表单字段名 | `RadioGroup`    | 有隐藏 `input` 可提交，且不允许取消为空                |
| 允许多项同时选中，需要表单提交数组     | `CheckboxGroup` | 每项一个隐藏 `input`，语义是复选                       |
| 一组「可按下的按钮」，允许一项都不选   | `ToggleGroup`   | 单选可取消；没有表单提交语义，值是组件状态不是表单字段 |
| 单个按下保持状态的按钮                 | `Toggle`        | 独立开关，不属于任何组                                 |

`ToggleGroup` 的单选用 `role="radiogroup"` + `role="radio"`，但点击已选中项会取消选择——这一点与原生 radio 的语义并不完全一致，是 Radix 的既有选择（本库照搬以保证行为与读屏表现相同）。对必须保证「始终有值」的场景请改用 `RadioGroup`。

## 与 Radix 的差异

| 差异                 | 本库                                                         | 原因                                                                                                              |
| -------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 部件命名             | `ToggleRoot` / `ToggleGroupRoot` / `ToggleGroupItem`         | Radix 的 `Toggle` / `ToggleGroup` / `Root` 别名在 Vue 里会与库内其它 Root 命名冲突                                |
| 事件名               | `update:pressed` / `update:value`                            | 对应 Vue 的 `v-model:` 约定，替代 `onPressedChange` / `onValueChange`                                             |
| `value` 类型         | `string \| string[]` 联合                                    | 模板上无法用泛型按 `type` 收窄，形状由运行期决定并校验                                                            |
| 键盘导航实现         | 就地写在 `useToggleGroup`                                    | Radix 依赖独立的共享包 RovingFocusGroup；本库 Tabs 与 RadioGroup 已有各自实现，抽公共层的时机未到                 |
| `data-disabled` 输出 | 禁用时同时给出原生 `disabled` 与 `data-disabled`             | Radix 由消费者把 `disabled` 透传给 Primitive；本库直接给出，少一个易漏的环节                                      |
| 焦点移动时机         | `keydown` 内同步 `focus()`                                   | Radix 用 `setTimeout` 是为了绕开 React 在事件里批处理更新的已知问题，Vue 不需要；推迟一帧反而会让连按方向键跟不上 |
| 样式层               | 提供 `.y-toggle`、`.y-toggle-group`、`.y-toggle-group__item` | 项被拼接成一段并共享圆角，选中项压在相邻项边框之上                                                                |

## 头层用法

```vue
<ToggleGroupRoot v-model:value="align" type="single" aria-label="对齐方式">
  <ToggleGroupItem value="left">左</ToggleGroupItem>
  <ToggleGroupItem value="center">中</ToggleGroupItem>
</ToggleGroupRoot>

<ToggleRoot v-model:pressed="bold">加粗</ToggleRoot>
```

无头层不输出任何 class；`data-part`（`root` / `item`）与上面的 `data-*` 是样式层的接口。
