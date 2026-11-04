<script setup>
import IndicatorDemo from '../.vitepress/components/IndicatorDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
import RadioGroupDemo from '../.vitepress/components/RadioGroupDemo.vue';
</script>

# RadioGroup 单选组

一组互斥选项，行为对齐 Radix 的 `RadioGroup.Root` / `Item` / `Indicator`。实现 `role="radiogroup"` 语义、组内唯一 Tab 停靠点、方向键导航即选中、整组禁用与单项禁用的合并，以及隐藏原生 input 的表单提交。

## 基础示例

<Preview description="第一组带 name，可参与真实表单提交；方向键会跳过禁用项；第二组无 name 因此不渲染隐藏 input；第三组整组禁用。">
  <RadioGroupDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { RadioGroup, RadioGroupItem } from '@agile-plus/components/radio-group';

const delivery = ref('standard');
</script>

<template>
  <RadioGroup v-model="delivery" name="delivery" aria-labelledby="delivery-label">
    <span id="delivery-label">配送方式</span>

    <RadioGroupItem value="standard">标准配送</RadioGroupItem>
    <RadioGroupItem value="express">次日达</RadioGroupItem>
    <RadioGroupItem value="pickup" disabled>门店自提</RadioGroupItem>
  </RadioGroup>
</template>
```

命名与 Radix 一致：Radix 中并不存在独立的 `Radio` 组件，选项就叫 `RadioGroup.Item`，在本库里即 `RadioGroupItem`。

## RadioGroup

### Props

| 属性              | 类型                         | 默认值         | 说明                                                    |
| ----------------- | ---------------------------- | -------------- | ------------------------------------------------------- |
| `modelValue`      | `string`                     | `undefined`    | 受控选中值，传入后进入受控模式                          |
| `defaultValue`    | `string`                     | `''`           | 非受控初始值；空字符串表示「未填写」                    |
| `name`            | `string`                     | `undefined`    | 表单字段名，对应隐藏 input 的 name                      |
| `disabled`        | `boolean`                    | `false`        | 整组禁用                                                |
| `required`        | `boolean`                    | `false`        | 输出 `aria-required`                                    |
| `loop`            | `boolean`                    | `true`         | 键盘导航到边界后是否循环                                |
| `orientation`     | `'horizontal' \| 'vertical'` | `'horizontal'` | 排列方向，输出 `aria-orientation` 与 `data-orientation` |
| `ariaLabelledby`  | `string`                     | `undefined`    | 组标题元素 id                                           |
| `ariaDescribedby` | `string`                     | `undefined`    | 组说明元素 id                                           |

### Events

| 事件                | 参数            | 说明                |
| ------------------- | --------------- | ------------------- |
| `update:modelValue` | `value: string` | 配合 `v-model` 使用 |

## RadioGroupItem

| 属性       | 类型      | 默认值  | 说明                                     |
| ---------- | --------- | ------- | ---------------------------------------- |
| `value`    | `string`  | 必填    | 选项值，同组内必须唯一，重复注册会被忽略 |
| `disabled` | `boolean` | `false` | 该项单独禁用                             |

默认插槽是选项的可见文本。渲染结构：

```html
<button
  type="button"
  role="radio"
  class="y-radio"
  id="v-0-radio-standard"
  aria-checked="true"
  tabindex="0"
  data-state="checked"
  data-value="standard"
>
  <!-- 仅当 RadioGroup 提供 name 时才存在 -->
  <input
    type="radio"
    name="delivery"
    value="standard"
    checked
    aria-hidden="true"
    tabindex="-1"
    style="position:absolute;opacity:0;pointer-events:none;width:100%;height:100%"
  />

  <!-- Indicator 仅在该项选中时存在，未选中时这一整段不在 DOM 里 -->
  <span class="y-radio__indicator" aria-hidden="true" data-part="indicator" data-state="checked">
    <span class="y-radio__dot"></span>
  </span>
  <span class="y-radio__label">标准配送</span>
</button>
```

## RadioGroupIndicator

选中指示元素，对齐 Radix 的 `RadioGroup.Indicator`：由消费者放在 `RadioGroupItem` 内部的任意位置，**默认只在选中时挂载**。

| 属性         | 类型      | 默认值  | 说明                                                           |
| ------------ | --------- | ------- | -------------------------------------------------------------- |
| `forceMount` | `boolean` | `false` | 未选中时也保留该元素，用 `data-state` 驱动样式                 |
| `as`         | `string`  | `span`  | 渲染的目标标签名，与 Flex 同样的约定：只开放原生标签名         |
| `asChild`    | `boolean` | `false` | 不渲染自身容器，把属性合并到唯一的子元素上（由 Slot 提供语义） |

输出 `aria-hidden="true"` 与 `data-state="checked|unchecked"`。选中语义只由外层 button 的 `aria-checked` 表达，指示元素本身不进无障碍树。

它必须写在 `RadioGroupItem` 内部：选中状态取自 Item 提供的 item 级上下文（`radioGroupItem`），脱离 Item 使用时属于开发期用法错误并抛异常。

### 用法对照

<Preview description="每行末尾的数字是真实 DOM 查询结果：默认挂载的行在未选中时为 0，forceMount 恒为 1。">
  <IndicatorDemo />
</Preview>

### 默认：只在选中时存在

```vue
<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem } from '@agile-plus/ui/radio-group';
</script>

<template>
  <RadioGroupItem value="standard" class="my-radio">
    <span class="my-label">标准配送</span>

    <!-- 未选中时，这一整段不会出现在 DOM 里 -->
    <RadioGroupIndicator class="my-dot">
      <span class="my-dot__inner" />
    </RadioGroupIndicator>
  </RadioGroupItem>
</template>
```

样式靠「存在即选中」表达，入场动画要用 `@keyframes`：元素从不存在到存在不会触发 `transition`。

```scss
.my-dot {
  display: inline-flex;
  width: 16px;
  height: 16px;
  border: 1px solid var(--y-color-primary);
  border-radius: 50%;
  animation: my-dot-in 0.1s ease-out;
}

.my-dot__inner {
  width: 8px;
  height: 8px;
  background: var(--y-color-primary);
  border-radius: 50%;
}

@keyframes my-dot-in {
  from {
    transform: scale(0.4);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .my-dot__inner {
    animation: none;
  }
}
```

### forceMount：元素常驻

需要进出两段动画时用 `forceMount`，此时可见性由 `data-state` 驱动，`transition` 两头都能生效。

```vue
<RadioGroupIndicator force-mount class="my-dot">
  <span class="my-dot__inner" />
</RadioGroupIndicator>
```

```scss
.my-dot__inner {
  transform: scale(0);
  opacity: 0;
  transition:
    transform 0.1s ease-out,
    opacity 0.1s;
}

// Indicator 自带 data-state，直接命中它自己，不需要写父级复合选择器。
.my-dot[data-state='checked'] .my-dot__inner {
  transform: scale(1);
  opacity: 1;
}
```

### as：换掉渲染标签

只开放原生标签名。画图标时比嵌套两层 `span` 更省：

```vue
<RadioGroupIndicator
  as="svg"
  width="16"
  height="16"
  viewBox="0 0 16 16"
  class="my-dot"
  style="color: var(--y-color-primary)"
>
  <circle cx="8" cy="8" r="4" fill="currentColor" />
</RadioGroupIndicator>
```

`width` / `height` / `viewBox` 这类额外属性会随 `$attrs` 一起落到 `svg` 上。

### asChild：不产生自己的节点

`asChild` 让 Indicator 不再输出容器元素，而是把 `aria-hidden`、`data-part`、`data-state` 和 `class` 合并到唯一的子元素上——少一层 DOM，样式选择器也随之简化。

```vue
<RadioGroupIndicator as-child class="my-dot">
  <span class="my-own-dot" />
</RadioGroupIndicator>
```

渲染结果是单个元素，两个 class 合并在同一节点上：

```html
<span
  class="my-own-dot my-dot"
  aria-hidden="true"
  data-part="indicator"
  data-state="checked"
></span>
```

`asChild` 需要且只需要一个元素子节点，否则由 Slot 抛出异常（`v-if` 未命中留下的注释节点与纯空白文本不计入）。

两种挂载方式的选择：

| 方式         | DOM          | 动画能力                                                                            |
| ------------ | ------------ | ----------------------------------------------------------------------------------- |
| 默认         | 仅选中时存在 | 只有入场动画（元素从不存在到存在不会触发 `transition`，样式层用 `@keyframes` 补上） |
| `forceMount` | 常驻         | 进出两段都可用 `transition`，因为元素始终存在                                       |

`prefers-reduced-motion` 下入场动画被关闭，圆点直接落到状态变量对应的可见性，不会因动画缺失而看不到选中反馈。

## 隐藏 input 与表单提交

提供 `name` 时，每个选项会渲染一个视觉上不可见的原生 `input[type=radio]`，其 `checked` 始终由组件的选中值驱动，因此能随外层 `<form>` 一起提交。

几个必须成立的约束：

- `tabindex="-1"`：原生 radio 会参与浏览器的分组焦点序，不移出 tab 序列就会出现「Tab 两次才能穿过一组」。
- `pointer-events: none`：让点击只落在外层 button 上，避免一次交互触发两套选中路径。
- 禁用项输出原生 `disabled`：提交时由浏览器负责忽略它，而不是组件自己模拟一套选择规则。
- `aria-hidden="true"`：选中语义只由外层 button 的 `aria-checked` 表达，避免屏幕阅读器重复播报。

不提供 `name` 时完全不渲染该 input——没有提交目标时，多出来的原生控件只会带来焦点与分组行为。

> **与 Checkbox / Switch 的当前差异**：这两个组件已经改用共享的 bubble input 接线（`@agile-plus/primitives/form` + `useBubbleInput`：input 是触发元素的兄弟节点、按实测尺寸覆盖、`checked` 走原型 setter 并派发 `change`、监听 `form` 的 reset）。RadioGroup 仍是自己的一套：input 嵌在 `<button>` 内、`checked` 走 attribute、靠 `@change` 选中。差异的原因是它由组级 composable 出属性表，迁过去要先给每个选项接上元素引用，因此留作单独一轮；在此之前不要按 Checkbox 的渲染条件（是否在 `<form>` 内）来推断 radio 的行为。

## 选中值可以为空

RadioGroup 与 Tabs 的一处刻意差异：注册首个选项时不会自动选中。

radio 语义允许整组未选中，用于表单的「尚未填写」初始态；而 tablist 必须始终存在激活项，否则面板无内容可展示。因此 RadioGroup 的 `value` 允许是空字符串，此时 Tab 停靠点落在第一个可用项上。

## Tab 停靠点规则

组内始终只有一个可 Tab 进入的选项：

| 情形     | `tabindex="0"` 的选项 |
| -------- | --------------------- |
| 有选中项 | 该选中项              |
| 无选中项 | 第一个未禁用的选项    |
| 整组禁用 | 无（全部 `-1`）       |

组内移动只能使用方向键。

## 键盘交互

| 按键                       | 行为                                            |
| -------------------------- | ----------------------------------------------- |
| `ArrowDown` / `ArrowRight` | 移动到下一个可用项并选中，边界默认循环          |
| `ArrowUp` / `ArrowLeft`    | 移动到上一个可用项并选中，边界默认循环          |
| `Home`                     | 第一个可用项并选中                              |
| `End`                      | 最后一个可用项并选中                            |
| `Space`                    | 选中当前聚焦项（由 button 原生 click 行为提供） |

四个方向键都能导航，与 `orientation` 无关——这是原生 radio group 的行为，`orientation` 只影响视觉排列与 `aria-orientation`。

方向键会**同时**移动焦点并改变选中值。若只移动焦点，`aria-checked` 会与视觉状态分离。

## 禁用状态的合并规则

```ts
isItemDisabled(value) === groupDisabled || itemDisabled(value);
```

整组禁用时导航列表变为空，方向键不再响应。禁用项也不会被鼠标选中——`aria-disabled` 不是原生 `disabled`，浏览器仍会派发 `click`，因此在 UI 层的选中方法内显式拦截。

标题与说明不内置组件：组标签元素由消费者决定，通过 `ariaLabelledby` / `ariaDescribedby` 直接关联任意 id 即可。

## 无样式层用法

需要自定义 DOM 结构时直接使用 UI 层，行为与 ARIA 完全相同，只是没有 class：

```vue
<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '@agile-plus/ui/radio-group';
</script>

<template>
  <RadioGroupRoot v-model="value" name="plan">
    <RadioGroupItem value="free" class="my-radio">
      <span class="my-label">免费版</span>

      <!-- Indicator 位置由消费者决定，这里放在文本之后 -->
      <RadioGroupIndicator class="my-dot" />
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
```

## useRadioGroup

```ts
import { useRadioGroup } from '@agile-plus/headless';

const { value, getRootProps, getItemProps, getInputProps, onItemKeydown, setValue } = useRadioGroup(
  { defaultValue: 'standard', name: 'delivery' }
);
```

| 返回值                             | 类型                                         | 说明                                   |
| ---------------------------------- | -------------------------------------------- | -------------------------------------- |
| `value`                            | `ComputedRef<string>`                        | 当前选中值，空字符串表示未选中         |
| `isGroupDisabled`                  | `ComputedRef<boolean>`                       | 整组是否禁用                           |
| `hasName`                          | `ComputedRef<boolean>`                       | 是否应渲染隐藏 input                   |
| `setValue(value)`                  | `(value: string) => void`                    | 设置选中值，不校验目标可用性           |
| `registerItem(value)`              | `(value: string) => void`                    | 注册选项，顺序即导航顺序，重复注册幂等 |
| `setItemDisabled(value, disabled)` | `(value: string, disabled: boolean) => void` | 更新单项禁用态                         |
| `unregisterItem(value)`            | `(value: string) => void`                    | 注销选项                               |
| `isItemDisabled(value)`            | `(value: string) => boolean`                 | 合并组级与单项禁用                     |
| `getRootProps()`                   | `Record<string, unknown>`                    | ARIA 属性，绑定到组容器                |
| `getItemProps(value)`              | `Record<string, unknown>`                    | ARIA 属性，绑定到选项                  |
| `getInputProps(value)`             | `Record<string, unknown> \| null`            | 隐藏 input 属性，无 name 时为 `null`   |
| `onItemKeydown(event)`             | `(event: KeyboardEvent) => void`             | 绑定到选项的 `@keydown`                |

选项 id 由 `useId()` 的实例前缀加上 value 组成，因此同一页面存在多个 value 相同的组时不会冲突（`v-0-radio-standard` 形式）。

## 为什么 RadioGroup 没有状态机

Primitives 层为它只提供 `handleRadioGroupKeydown` 一个纯函数，没有状态机文件。

原因是它的状态只有一个 `value`，所有交互都只是给它赋新值，不存在需要集中约束的合法状态组合——为它建状态机只会多出一层无收益的间接。这与 Dialog（开/关 + 四个关联 id）和 Tabs（激活值 + 注册顺序 + 焦点值）不同，后两者的状态转换确实需要被集中约束。

可选值列表与禁用态同样不在状态机里：它们需要与渲染结果严格一致，由适配层的注册表维护，primitives 只接收已过滤好的可用值列表并计算下一个目标。

## 无障碍行为

| 项         | 实现                                                           |
| ---------- | -------------------------------------------------------------- |
| 结构       | `role="radiogroup"` / `role="radio"`                           |
| 选中状态   | `aria-checked` + `data-state="checked\|unchecked"`             |
| 禁用状态   | `aria-disabled` + `data-disabled`                              |
| 组名       | `aria-labelledby`，由消费者关联标题元素                        |
| 组说明     | `aria-describedby`                                             |
| 必选       | `aria-required`                                                |
| 方向       | `aria-orientation` + `data-orientation`                        |
| Tab 停靠点 | 组内唯一，见上方规则表                                         |
| 指示元素   | `aria-hidden="true"`，选中语义只由 `aria-checked` 表达         |
| 隐藏 input | `aria-hidden="true"` + `tabindex="-1"`，不进入无障碍树与焦点序 |

## 样式钩子

```text
.y-radio-group                      组容器
.y-radio-group[data-orientation]    排列方向
.y-radio                            选项根节点（button）
.y-radio[data-state='checked']      选中态
.y-radio[data-disabled]             禁用态
.y-radio__indicator                 指示圈（仅该项选中时存在，除非 forceMount）
.y-radio__dot                       圆点
.y-radio__label                     文本
```

状态切换用可继承的自定义属性表达，而不是「父状态 + 子元素」的深层复合选择器：

```scss
--y-radio-state-border        // 指示圈边框色
--y-radio-state-bg-indicator  // 指示圈底色
--y-radio-state-color-label   // 文本色
--y-radio-state-dot-scale     // 圆点缩放
--y-radio-state-dot-opacity   // 圆点透明度
```

设计层变量（`--y-radio-size`、`--y-radio-dot-size`、`--y-radio-border`、`--y-radio-border-hover`、`--y-radio-border-checked`、`--y-radio-dot-color`、`--y-radio-bg-indicator`、`--y-radio-bg-indicator-disabled`、`--y-radio-color-label`、`--y-radio-color-label-disabled`）与状态层变量必须分开命名，否则会出现 `--x: var(--x)` 循环引用，浏览器会将整条声明判定为无效。

## 与 Radix 的差异

以下差异是明确取舍，不是遗漏：

| 项目           | Radix                                                     | 本库                                                                                                                                                           |
| -------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 命名形式       | `RadioGroup.Root` / `.Item` / `.Indicator` 命名空间       | `RadioGroupRoot` / `RadioGroupItem` / `RadioGroupIndicator` 平铺导出，遵循 Vue 与项目内 Dialog / Tabs 的既有约定                                               |
| Indicator 挂载 | 包 `Presence`，仅选中时存在于 DOM，卸载时会等退出动画结束 | 同样仅选中时挂载；但卸载是即时的，没有 `Presence` 那套「等 animation/transition 结束后再移除」的生命周期，因此需要退场动画时请使用 `forceMount` + `transition` |
| RTL            | Root 支持 `dir`，影响左右箭头方向                         | 不支持，四个方向键始终按同一路径导航                                                                                                                           |
| 样式           | 完全无样式，class 由消费者提供                            | 额外的 Components 层预置指示圈、圆点与文本结构                                                                                                                 |

## Primitives 层

```ts
import { handleRadioGroupKeydown } from '@agile-plus/primitives/radio-group';

const { nextValue, handled } = handleRadioGroupKeydown('ArrowRight', {
  enabledValues: ['standard', 'express'],
  focusedValue: 'standard',
  loop: false,
});
// → { nextValue: 'express', handled: true }
```

该函数不读取 DOM、不判断禁用，只做纯计算，因此可以脱离浏览器独立测试。
