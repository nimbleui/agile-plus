<script setup>
import TooltipDemo from '../.vitepress/components/TooltipDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# Tooltip 提示

非模态的补充信息，对应 Radix Primitives 的 `tooltip` 包。四层实现：`primitives/tooltip` 负责延迟决策与指针容差区几何，`headless/useTooltip` 负责开合与触发，定位由 `headless/useFloating` 承担，`ui/tooltip` 提供 ARIA 结构与 portal，`components/tooltip` 注入样式。

**它不管理焦点。** 与 Dialog 不同，Tooltip 不做焦点陷阱、不锁滚动：焦点始终留在触发元素上，读屏通过 `aria-describedby` 读到内容。

**浮层内容的挂载时机**：首次打开才挂载（`usePresence` 的 v-if）；打开过一次之后**常驻不销毁**——成品层 `keepMounted` 默认为真，关闭只剩 `data-state="closed"` 加样式隐藏，重开不必重建 DOM 与重新测量。要旧的「关闭即卸载」就传 `:keep-mounted="false"`；`ui` 层与无头层默认不常驻，常驻判定在 `headless/useKeepMounted`。

## 基础示例

<Preview description="五个朝向与触发方式、延迟与跳过延迟、内容可悬停、箭头开关、自定义触发元素、受控开合、键盘触发，以及窄视口下的边缘翻转。">
  <TooltipDemo />
</Preview>

```vue
<script setup lang="ts">
import { Tooltip } from '@agile-plus/components/tooltip';
</script>

<template>
  <Tooltip placement="top">
    <template #trigger>保存</template>
    保存当前修改
  </Tooltip>
</template>
```

`trigger` 插槽里写触发元素的**文字**，不要再放一个 `<button>`：成品层已经渲染了 button，再包一层就是嵌套交互元素（非法 HTML），而且 Tab 会落在内层按钮上，`focus` 不冒泡到外层，键盘触发直接失效。要用自己的元素替换那个 button，开 `trigger-as-child`。

需要完全控制结构时用无样式层自行组合：

```vue
<script setup lang="ts">
import { TooltipArrow, TooltipContent, TooltipRoot, TooltipTrigger } from '@agile-plus/ui/tooltip';
</script>

<template>
  <TooltipRoot placement="top" :arrow="{ size: 8 }">
    <TooltipTrigger as-child>
      <button type="button">保存</button>
    </TooltipTrigger>

    <TooltipContent class="my-tooltip">
      保存当前修改
      <TooltipArrow class="my-tooltip__arrow" />
    </TooltipContent>
  </TooltipRoot>
</template>
```

## 成品层 Props

| 属性                      | 类型                       | 默认值       | 说明                                                |
| ------------------------- | -------------------------- | ------------ | --------------------------------------------------- |
| `open` / `v-model:open`   | `boolean`                  | `undefined`  | 受控开合；不传即非受控                              |
| `defaultOpen`             | `boolean`                  | `false`      | 非受控初值                                          |
| `delayDuration`           | `number`                   | `700`        | 常规打开延迟（毫秒）                                |
| `skipDelayDuration`       | `number`                   | `300`        | 同一触发元素上次关闭后，多长时间内重新悬停立即打开  |
| `disableHoverableContent` | `boolean`                  | `false`      | 离开触发元素立即关闭，不建立指针容差区              |
| `placement`               | `FloatingPlacement`        | `'top'`      | 期望位置，可带 `-start` / `-end` 对齐               |
| `offset`                  | `number \| FloatingOffset` | `8`          | 与触发元素的间距                                    |
| `flip`                    | `boolean`                  | `true`       | 空间不足时翻转到对边与对立对齐                      |
| `shift`                   | `boolean`                  | `true`       | 沿交叉轴钳制进边界                                  |
| `padding`                 | `number`                   | `0`          | 与边界的最小留白                                    |
| `strategy`                | `'fixed' \| 'absolute'`    | `'absolute'` | 定位策略；默认随文档原生滚动                        |
| `container`               | `string \| HTMLElement`    | `'body'`     | portal 目标                                         |
| `forceMount`              | `boolean`                  | `false`      | 关闭后仍保留在 DOM，用于自行处理退场动画            |
| `keepMounted`             | `boolean`                  | `true`       | 打开过一次之后常驻 DOM；关掉即回到关闭即卸载        |
| `showArrow`               | `boolean`                  | `true`       | 是否渲染箭头                                        |
| `arrowSize`               | `number`                   | `8`          | 箭头边长，同时用于计算偏移                          |
| `triggerAsChild`          | `boolean`                  | `false`      | 触发器不渲染 button，把属性合并到插槽里的唯一元素上 |

插槽：`trigger`（触发元素的文字）、默认插槽（提示正文）。

`triggerAsChild` 缺省 false 是刻意的：插槽里放纯文本时 `asChild` 会抛错（它要求恰好一个元素子节点），默认渲染 button 才能让「给一段文字加提示」直接成立。

自家渲染的 button 带 `type="button"`：HTML 里 `<button>` 缺省即 `submit`，不带它的话一个放在表单里的提示按钮会顺手提交表单。`asChild` 换成 `<a>` 等元素时不输出该属性——`<a>` 的 `type` 是链接的媒体类型，写上去是错误语义。

## 无样式层部件

| 部件             | 渲染                  | 职责                                                   |
| ---------------- | --------------------- | ------------------------------------------------------ |
| `TooltipRoot`    | 不渲染元素            | 持有开合状态与定位实例，下发上下文                     |
| `TooltipTrigger` | `<button>` 或 asChild | 接指针与焦点两条触发路径，元素引用交给 floating 做锚点 |
| `TooltipContent` | portal 后的 `<div>`   | `role="tooltip"`、定位样式、`data-side`、内容指针事件  |
| `TooltipArrow`   | `<span>` 或 asChild   | 消费交叉轴偏移，`data-side` 交给样式层决定贴哪条边     |

`TooltipContent` 与 `TooltipArrow` 必须写在 `TooltipRoot` 内，`TooltipArrow` 还必须在 `TooltipContent` 内（偏移是相对浮层自身坐标系的）。脱离上下文使用会抛错，而不是静默失效。

## 触发与延迟

```text
指针进入触发元素 → 算出本次延迟
                    ├─ 上次关闭在 skipDelayDuration 内 → 0，立即打开（instant-open）
                    └─ 否则 → delayDuration，等满才打开（delayed-open）
指针离开触发元素 → 取消未完成的打开计时
                    ├─ disableHoverableContent → 立即关闭
                    └─ 否则 → 建立容差区，跟踪 document 上的 pointermove
焦点进入触发元素 → 立即打开（键盘用户已明确停下，再等只是迟钝）
焦点离开 / Escape → 关闭
指针进入内容     → 取消容差跟踪，此后由内容的 pointerleave 决定关闭
指针离开内容     → 关闭
```

`data-state` 有三个取值：`closed`、`delayed-open`、`instant-open`。区分后两者是为了让样式层分别给过渡——连续触发时立即出现，避免淡入被看成闪烁。

## 指针容差区

提示与触发元素之间有空隙，指针穿过它时必然先离开触发元素。若一离开就关闭，用户永远无法把指针移到提示上去点里面的链接。容差区是连接「触发元素朝向提示的那条边」与「提示朝向触发元素的那条边」的四边形，指针落在其中就视为仍在交互。

两个实现取舍：

- **用整条边而不是中心连线**：指针可以从触发元素任意位置斜穿到提示任意位置，窄三角形会把合理的斜向移动判成离开。
- **多边形只量一次**：在指针离开触发元素的那一刻读取两个矩形并缓存，之后的 `pointermove` 只做纯几何判定，不再读布局。`pointermove` 是高频事件，逐次读矩形会造成不必要的布局读取。代价是容差区存续期间若页面滚动，多边形会失效——这与 Radix 的已知边界相同。

## 定位

由 `useFloating` 承担，顺序是 **翻转 → 基础坐标 → 交叉轴钳制 → 箭头**：

- 翻转判据是「翻转后溢出更小」而不是「不溢出」：浮层比视口还高时两侧都放不下，仍应选较差的一侧。
- 钳制只动交叉轴，不动主轴——主轴一旦钳制就会压掉与触发元素的间距，看起来像贴错元素。
- 箭头用钳制之后的坐标计算，否则被推走的浮层上箭头会指偏。
- `arrowStyle` 只给交叉轴偏移；贴哪条边由 `data-side` 交给样式层，因为那是视觉形状而不是位置计算。

默认 `strategy="absolute"`：结果换算成页面坐标，浮层落在文档层，窗口滚动由浏览器带着它一起移动，滚动跟随因此没有滞后。**前提是浮层的 offsetParent 是文档本身**（portal 到 body 且 body/html 未定位）。把内容放进已定位或带 transform 的祖先里时改用 `fixed`——但 fixed 靠 scroll 事件逐帧重算追赶，合成器推进滚动的中间帧里浮层还在旧位置，快速滚动会看到抖动。

## 无障碍行为

| 项       | 说明                                                                |
| -------- | ------------------------------------------------------------------- |
| 关联     | 打开时触发元素的 `aria-describedby` 指向内容 id；关闭时不输出该属性 |
| 角色     | 内容为 `role="tooltip"`                                             |
| 焦点     | 不移动焦点、不做焦点陷阱、不锁滚动                                  |
| 键盘     | 聚焦触发元素立即打开；Escape 关闭                                   |
| 箭头     | `aria-hidden="true"`，纯装饰                                        |
| 触发元素 | 不强行加 `tabindex`：装饰元素不该因此变成 Tab 落点                  |
| 减少动效 | `prefers-reduced-motion` 下关闭淡入过渡                             |

## 与 Radix 的差异

| 项目       | Radix                                        | 本库                                                 |
| ---------- | -------------------------------------------- | ---------------------------------------------------- |
| Provider   | 有 `TooltipProvider`，跨触发元素共享跳过延迟 | 无 Provider，跳过延迟是**实例级**的                  |
| 定位       | 依赖 `@floating-ui/dom`                      | 自建 `primitives/floating`，零外部运行时依赖         |
| 箭头偏移   | middleware 数据                              | `arrowStyle` 只给交叉轴偏移，贴边由 `data-side` 决定 |
| 关闭时机   | 离开容差区即关闭                             | 相同                                                 |
| 内容可悬停 | `disableHoverableContent`                    | 相同                                                 |

## 已知限制

- **跳过延迟不跨触发元素**：在一组相邻按钮之间移动时，每个按钮仍各自等 `delayDuration`。共享时间窗需要 Provider，等多提示场景真实出现再加。
- **容差区不跟随滚动**：多边形在建立时量一次，存续期间页面滚动会让它失效。
- **祖先滚动容器内的跟随仍有一帧滞后**：浮层 portal 出了该容器，容器滚动只能靠 JS 逐帧重算；窗口滚动是文档层原生跟随，无滞后。
- **提示内容不可交互时应当开启 `disableHoverableContent`**：否则提示会跟着指针多停留一段，看起来像关不掉。
- **触发元素必须可聚焦**：组件不加 `tabindex`，给 `span` 之类的装饰元素加提示时键盘用户读不到。
- **文案不做本地化**：内容由消费者写在插槽里。
