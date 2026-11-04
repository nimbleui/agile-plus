<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import ProgressDemo from '../.vitepress/components/ProgressDemo.vue';
</script>

# Progress 进度条

`role="progressbar"` 的进度条，对应 Radix Primitives 的 `progress` 包。Radix 对外只有 `Progress`（=Root，轨道）与 `Progress.Indicator`（填充段）两个部件，本库同样是这两个部件加一个样式层封装。

## 基础示例

<Preview description="第一段是 0~100 的常规进度，可自动推进或直接完成；第二段上限是 8 步并自定义播报文本；第三段是不确定进度（value=null），轨道来回扫动。">
  <ProgressDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Progress } from '@agile-plus/components/progress';

const step = ref(30);
</script>

<template>
  <Progress :value="step" />

  <Progress :value="2" :max="8" :get-value-label="(v, m) => `${v} / ${m} 步`" />

  <Progress :value="null" />
</template>
```

## Progress

### Props

| 属性            | 类型                     | 默认值      | 说明                                    |
| --------------- | ------------------------ | ----------- | --------------------------------------- |
| `value`         | `number \| null`         | `null`      | 当前进度；`null` 与非有限数是不确定进度 |
| `max`           | `number`                 | `100`       | 进度上限；非正的有限数回退到 100        |
| `getValueLabel` | `(value, max) => string` | `undefined` | 读屏文本，缺省取整百分比                |
| `as`            | `string`                 | `'div'`     | 轨道渲染的目标标签名                    |

### Events

没有事件，也没有 `v-model:value`。进度条不接受用户输入，值的唯一来源是外部数据；做成受控/非受控双模式只会多出一个没人能写入的内部状态。Radix 同样只有这三个业务 prop，没有 `onValueChange`。

## 三态与 `data-state`

| `value` | `data-state`    | `aria-valuenow` | `aria-valuetext` | 视觉               |
| ------- | --------------- | --------------- | ---------------- | ------------------ |
| `0~max` | `loading`       | 该值            | 百分比或自定义   | 轨道按比例填充     |
| `= max` | `complete`      | 该值            | `100%`           | 填满               |
| `null`  | `indeterminate` | 不输出          | 不输出           | 一段来回扫动的轨道 |

不确定进度下**不输出** `aria-valuenow` / `aria-valuetext`，而不是写成空串：空串是无效值，而「有 `role="progressbar"` 却没有当前值」正是 ARIA 表达「正在进行但无法量化」的方式。`aria-valuemin` 与 `aria-valuemax` 两种状态下都输出，读屏才知道量程。

## 为何少一层

Progress 没有 headless 层，走 `primitives → ui → components` 三层，与本库其它复合组件不同。判断依据是这三件事都不成立：

- **没有状态组合**：进度值来自外部，组件内部不持有任何可变状态，也没有受控/非受控两套写法。
- **没有生命周期与 DOM 副作用**：不绑事件、不起观察器、不测量元素，因此没有需要创建与释放的资源。
- **没有跨部件协调**：Root 与 Indicator 之间只有一份只读配置要传，`provide` 一个 `computed` 就够，不需要 composable 实例做真值源。

在这种前提下包一个 `useProgress`，里面只会是一个 `computed` 换个名字，消费者反而要多读一层。这与 `Flex` 少一层是同一条判断，不是「省事的例外」。

## 数值通道

进度是连续值，样式层无法用有限的属性选择器枚举，所以本库在 `data-*` 之外开了第二个层间接口：无头层在**轨道根节点**上声明无单位比例，宽度换算完全留在样式层。

```html
<div class="y-progress" role="progressbar" style="--y-progress-value: 0.42">
  <div class="y-progress__indicator" data-state="loading" data-value="42" data-max="100"></div>
</div>
```

```scss
.y-progress__indicator {
  width: calc(var(--y-progress-value, 0) * 100%);
  transition: width var(--y-progress-duration) var(--y-progress-ease);
}
```

三个约束必须成立：

- **变量声明在根上，Indicator 作为后代读取**。自定义属性只向下继承，反过来不成立——把变量写在 Indicator 上，轨道就永远读不到它。
- **不确定进度时不写这个变量**，宽度由 `[data-state='indeterminate']` 分支给出。写 `0` 会让样式层的默认宽度把扫动段落压成一条线。
- **宽度换算归样式层**。无头层如果直接内联 `width: 42%`（Radix 官方示例的做法），本层就再也换不成 `transform` 位移，也加不了轨道内缩边距。

## 无样式层用法

```vue
<script setup lang="ts">
import { ProgressIndicator, ProgressRoot } from '@agile-plus/ui/progress';
</script>

<template>
  <ProgressRoot :value="42" class="my-track">
    <ProgressIndicator class="my-fill" />
  </ProgressRoot>
</template>
```

两个部件都支持 `as` 与 `asChild`。用 `asChild` 替换轨道时，被替换的元素必须是**唯一**的子节点，把 Indicator 放进它里面：

```vue
<ProgressRoot :value="42" as-child>
  <section class="my-track">
    <ProgressIndicator class="my-fill" />
  </section>
</ProgressRoot>
```

带样式的 `Progress` 不开放 `asChild`：它在 Root 里预置了 Indicator，插槽会出现「轨道元素 + 指示条」两个子节点，而 Slot 的 `asChild` 要求恰好一个元素子节点。

## 无障碍行为

| 项       | 说明                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------- |
| 角色     | 根元素 `role="progressbar"`，Indicator 不带 role 与 aria                                                  |
| 量程     | `aria-valuemin="0"` + `aria-valuemax`，两种状态下都输出                                                   |
| 当前值   | `aria-valuenow`，不确定进度时不输出                                                                       |
| 播报文本 | `aria-valuetext`，缺省取整百分比；不确定进度时不输出                                                      |
| 重复播报 | Indicator 只带 `data-*`：同一段进度由根元素播报一次                                                       |
| 焦点     | 无。进度条不是可操作控件，因此不输出 `tabindex`；信息靠 `aria-valuenow` / `aria-valuetext` 随状态变化播报 |
| 动态播报 | 值变化时 `aria-valuenow` / `aria-valuetext` 跟着变，读屏按节流播报                                        |

## 样式钩子

```text
.y-progress                                  轨道
.y-progress__indicator                       填充段
.y-progress__indicator[data-state='loading']       定量进行中（默认）
.y-progress__indicator[data-state='complete']      到达上限
.y-progress__indicator[data-state='indeterminate'] 不定量扫动
```

组件级变量：`--y-progress-height`、`--y-progress-radius`、`--y-progress-bg`、`--y-progress-indicator-bg`、`--y-progress-duration`、`--y-progress-ease`、`--y-progress-indeterminate-width`、`--y-progress-indeterminate-shift`、`--y-progress-indeterminate-duration`。

不定量段落的宽度与位移是**成对**的：段落占轨道 40%，自身位移 250% 正好走满轨道（`40% × 250% = 100%`）。只改其中一个会让动画在轨道中途折返或溢出。

减少动效时不定量状态不会静止——一条静止的轨道等于「没有进度」，语义就此丢失。这里只把扫动从 1.6s 放慢到 3.2s，并关掉宽度过渡。

## 与 Radix 的差异

| 项目             | Radix                                                             | 本库                                                                                       |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 部件与 prop 命名 | `Progress.Root` / `Progress.Indicator`，`value/max/getValueLabel` | 同名同签名（`ProgressRoot` / `ProgressIndicator`）                                         |
| `complete` 判定  | `value === max`                                                   | `value >= max`：超出上限时轨道已画满，Radix 会把状态永远停在 `loading`，状态与视觉互相矛盾 |
| 百分比文案       | `Math.round(value / max * 100)`，可报出 150%                      | 先把比例夹到 `[0,1]` 再换算，超上限播报 `100%`                                             |
| 非法 `max`       | 不做处理，`max=0` 会算出 `Infinity%`                              | 非正的有限数回退到 100，避免 `aria-valuenow="5" aria-valuemax="0"` 这种自相矛盾的 ARIA     |
| 指示条宽度       | 由消费者自己写行内 `width`，值直接拼成百分比                      | 无头层只给无单位比例，宽度换算留在样式层（见「数值通道」）                                 |
| `max` 属性       | 除 `data-max` 外还把 `max` 写成 div 的 attribute                  | 只写 `data-max`：`max` 不是 `div` 的有效属性                                               |
| 样式层 `asChild` | 提供，与预置 Indicator 同时使用会把属性并到指示条上               | 样式层不开放该组合，自定义结构请用 `@agile-plus/ui/progress` 自行组合                      |

## 已知限制

- 没有尺寸与语义色变体：本层只给一种高度与主色填充。需要 `success` / `warning` 之类的语义色，覆盖 `--y-progress-indicator-bg` 即可。
- 条内不放文本：可见的百分比由消费者放在组件外部，与 Checkbox 的 label 约定一致。
- 不确定进度的播报只有 `role`，没有文案：`getValueLabel` 按 Radix 的约定只在有数值时调用。要播报「正在加载」需要给根元素补 `aria-valuetext`，本库不擅自加这层语义。

## Primitives 层

```ts
import {
  getProgressDataAttrs,
  getProgressIndicatorAttrs,
  getProgressRatio,
  getProgressRootAttrs,
  getProgressState,
  getProgressVars,
} from '@agile-plus/primitives/progress';

getProgressState(100, 100); // 'complete'
getProgressState(null, 100); // 'indeterminate'
getProgressRatio(-10, 100); // 0
getProgressRatio(150, 100); // 1

getProgressRootAttrs({ value: 42, max: 100 });
// { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuenow': 42, 'aria-valuemax': 100,
//   'aria-valuetext': '42%', 'data-state': 'loading', 'data-value': 42, 'data-max': 100 }

getProgressVars({ value: 42, max: 100 }); // { '--y-progress-value': '0.42' }
```

`ProgressValue` / `ProgressConfig` / `ProgressDataState` / `GetProgressValueLabel` 四个类型同样从 `@agile-plus/primitives/progress` 导出；常量 `PROGRESS_DEFAULT_MAX` 与 `PROGRESS_VALUE_VAR` 是样式层与无头层共同引用的单一事实来源。
