<script setup>
import SelectDemo from '../.vitepress/components/SelectDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# Select 下拉选择

从一组选项里选一个值，对应 Radix Primitives 的 `select` 包。四层实现：`primitives/select` 负责按键解析、高亮导航、typeahead 与滚动换算，`headless/useSelect` 负责选中值与开合两个受控状态、选项注册表、定位与表单接入，`ui/select` 提供 ARIA 结构与 portal，`components/select` 注入样式。

**焦点始终留在触发器上。** 采用 ARIA 的 select-only combobox 模型：触发器是 `role="combobox"`，列表是 `role="listbox"`，高亮项通过 `aria-activedescendant` 指向，而不是把焦点移进浮层。因此不需要焦点陷阱、不锁滚动，`Tab` 天然能走出组件。

**列表的挂载时机**：首次打开才挂载（`usePresence` 的 v-if）；打开过一次之后**常驻不销毁**——成品层 `keepMounted` 默认为真，关闭只剩 `data-state="closed"` 加样式隐藏，列表的滚动位置留得住，重开也不必重建 DOM。要旧的「关闭即卸载」就传 `:keep-mounted="false"`；`ui` 层与无头层默认不常驻，常驻判定在 `headless/useKeepMounted`。

## 基础示例

<Preview description="基础回显、三档尺寸与三种外观、单项禁用、可清除、加载中、分组与富内容、长列表滚动跟随与边缘翻转、受控开合、表单提交与重置。">
  <SelectDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { Select } from '@agile-plus/components/select';

const city = ref('');

const cities = [
  { value: 'hangzhou', label: '杭州' },
  { value: 'ningbo', label: '宁波' },
  { value: 'wenzhou', label: '温州', disabled: true },
];
</script>

<template>
  <Select v-model="city" :options="cities" placeholder="选择城市" clearable />
</template>
```

`label` 缺省回落到 `value`，因此只给 `value` 的数据也能正常显示与搜索。

需要分组、分隔线或完全自定义结构时，用无样式层自行组合：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectRoot,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from '@agile-plus/ui/select';

const city = ref('');
</script>

<template>
  <SelectRoot v-model="city">
    <span class="my-select">
      <SelectTrigger class="my-select__trigger">
        <SelectValue placeholder="选择城市" />
      </SelectTrigger>
    </span>

    <SelectContent class="my-select__content">
      <SelectViewport>
        <SelectGroup>
          <SelectLabel>浙江</SelectLabel>

          <SelectItem value="hangzhou">
            <SelectItemIndicator>✓</SelectItemIndicator>
            <SelectItemText>杭州</SelectItemText>
          </SelectItem>
        </SelectGroup>

        <SelectSeparator />
      </SelectViewport>
    </SelectContent>
  </SelectRoot>
</template>
```

## 成品层 Props

| 属性                     | 类型                                     | 默认值           | 说明                                         |
| ------------------------ | ---------------------------------------- | ---------------- | -------------------------------------------- |
| `modelValue` / `v-model` | `string`                                 | `undefined`      | 受控选中值；不传即非受控                     |
| `defaultValue`           | `string`                                 | `''`             | 非受控初值，空串表示未选择                   |
| `open` / `v-model:open`  | `boolean`                                | `undefined`      | 受控开合；不传即非受控                       |
| `defaultOpen`            | `boolean`                                | `false`          | 非受控开合初值                               |
| `options`                | `SelectOptionItem[]`                     | `[]`             | 数据驱动的选项；写了默认插槽则完全接管       |
| `placeholder`            | `string`                                 | `'请选择'`       | 未选择时的占位文案                           |
| `size`                   | `'small' \| 'middle' \| 'large'`         | `'middle'`       | 尺寸，高度与字号取自全局 Token               |
| `variant`                | `'outlined' \| 'filled' \| 'borderless'` | `'outlined'`     | 外观                                         |
| `disabled`               | `boolean`                                | `false`          | 整体禁用                                     |
| `required`               | `boolean`                                | `false`          | 必选，落到隐藏原生 select 上参与原生校验     |
| `clearable`              | `boolean`                                | `false`          | 有值时显示清除按钮                           |
| `clearLabel`             | `string`                                 | `'清除选择'`     | 清除按钮的读屏文案                           |
| `loading`                | `boolean`                                | `false`          | 用 spinner 替换箭头                          |
| `block`                  | `boolean`                                | `false`          | 占满一行                                     |
| `name` / `form`          | `string`                                 | `undefined`      | 表单字段名与显式归属的表单 id                |
| `loop`                   | `boolean`                                | `true`           | 方向键到边界后是否循环                       |
| `typeaheadTimeout`       | `number`                                 | `1000`           | 首字搜索串的重置间隔（毫秒）                 |
| `ariaLabelledby`         | `string`                                 | `undefined`      | 指向标题元素 id                              |
| `ariaDescribedby`        | `string`                                 | `undefined`      | 指向说明元素 id                              |
| `placement`              | `FloatingPlacement`                      | `'bottom-start'` | 期望位置，可带 `-start` / `-end` 对齐        |
| `offset`                 | `number \| FloatingOffset`               | `4`              | 与触发器的间距                               |
| `flip` / `shift`         | `boolean`                                | `true`           | 空间不足时翻转 / 沿交叉轴钳制                |
| `padding`                | `number`                                 | `8`              | 与视口边缘的最小留白                         |
| `strategy`               | `'fixed' \| 'absolute'`                  | `'absolute'`     | 定位策略；默认随文档原生滚动                 |
| `container`              | `string \| HTMLElement`                  | `'body'`         | portal 目标                                  |
| `keepMounted`            | `boolean`                                | `true`           | 打开过一次之后常驻 DOM；关掉即回到关闭即卸载 |

事件：`update:modelValue`、`update:open`、`clear`。

插槽：`default`（接管整个选项列表）、`value`（回显，scoped `{ value, label }`）、`item`（逐项内容，scoped `{ option }`）、`empty`（空态文案）。

## 无样式层部件

| 部件                  | 渲染                  | 职责                                                         |
| --------------------- | --------------------- | ------------------------------------------------------------ |
| `SelectRoot`          | 不渲染元素            | 持有选中值与开合，下发上下文                                 |
| `SelectTrigger`       | `<button>` 或 asChild | `role="combobox"`，全部键盘交互绑在这里；渲染隐藏原生 select |
| `SelectValue`         | `<span>` 或 asChild   | 回显选中项文本，未选择时切到 placeholder                     |
| `SelectIcon`          | `<span>` 或 asChild   | 装饰性箭头，`aria-hidden`                                    |
| `SelectContent`       | portal 后的 `<div>`   | `role="listbox"`、定位样式、测量变量、`data-side`            |
| `SelectViewport`      | `<div>` 或 asChild    | 滚动容器，最大高度受可用空间限制                             |
| `SelectItem`          | `<div>` 或 asChild    | `role="option"`，登记进选项表                                |
| `SelectItemText`      | `<span>` 或 asChild   | 上报可读文本，作为 typeahead 与回显的搜索键                  |
| `SelectItemIndicator` | `<span>` 或 asChild   | 选中标记，默认只在选中时挂载                                 |
| `SelectGroup`         | `<div>` 或 asChild    | `role="group"`，`aria-labelledby` 指向组内 Label             |
| `SelectLabel`         | `<div>` 或 asChild    | 分组标题，必须在 Group 内                                    |
| `SelectSeparator`     | `<div>` 或 asChild    | `role="separator"`，不进选项表因此导航自然跳过               |

脱离对应父级使用会抛错，而不是静默失效：`SelectLabel` 必须在 `SelectGroup` 内，`SelectItemText` 与 `SelectItemIndicator` 必须在 `SelectItem` 内，其余部件必须在 `SelectRoot` 内。

## 键盘交互

| 按键               | 关闭态                 | 打开态                     |
| ------------------ | ---------------------- | -------------------------- |
| `↓`                | 打开，高亮选中项或首项 | 高亮下一项（跳过禁用）     |
| `↑`                | 打开，高亮选中项或末项 | 高亮上一项                 |
| `Home` / `End`     | 不接管                 | 高亮首项 / 末项            |
| `Enter` / `Space`  | 打开                   | 选中高亮项并关闭           |
| `Esc`              | 不接管                 | 关闭，不改值               |
| `Tab`              | 不接管                 | 关闭，焦点继续走向下一控件 |
| 可打印字符         | 直接换值，不展开       | 只移动高亮                 |
| 带 `Ctrl/Alt/Meta` | 交还浏览器             | 交还浏览器                 |

`Shift` 不算修饰键：`Shift+Tab` 仍要退出下拉，`Shift+字母` 是大写输入。

### 首字搜索（typeahead）

匹配的是**可读文本前缀**，忽略大小写与首尾空白，不是 `value`——中文选项就要按中文首字。两条规则来自原生 select 的手感：

- **连续按同一个键是循环**，不是把搜索串越拼越长。连按 `a` 在所有 a 开头的选项之间轮换。
- **多字符搜索从当前项找起（含当前项）**，因此 `ap` → `apr` 会停在同一项上，而不是每敲一个字母就跳回列表开头。

超过 `typeaheadTimeout` 再按键就重新开始累积。判定只依赖「距上次按键多久」，本层不持有定时器，因此没有需要清理的资源。

`SelectItemText` 的存在就是为了把搜索键从富内容里分离出来：选项里有角标、图标字符时，搜索只匹配 `ItemText` 的文本。给了 `textValue` 属性时以属性为准。

## 定位与尺寸

由 `useFloating` 承担，顺序是 **翻转 → 基础坐标 → 交叉轴钳制**。列表额外消费两个测量变量：

- `--y-select-trigger-width`：触发器实测宽度，列表至少与它同宽。
- `--y-select-content-available-height`：**实际所在边**到视口边缘的可用高度。

可用高度与坐标出自**同一次测量**（`useFloating.availableSpace`），因此 Select 不再自建第二套 `scroll` / `resize` 监听——两套监听会在同一帧各读一次布局，既浪费也会让位置与尺寸差一帧。列表最大高度取「设计上限」与「可用高度」的较小值，因此永远不超出视口，也不需要上下滚动按钮。

高亮项的滚动跟随只写视口自己的 `scrollTop`，不用 `scrollIntoView`：后者会连带滚动所有可滚动祖先，浮层被 portal 到 body 时会把整个页面也滚一段。

默认 `strategy="absolute"`：结果换算成页面坐标，列表落在文档层，窗口滚动由浏览器带着它一起移动，滚动跟随没有滞后。**前提是浮层的 offsetParent 是文档本身**（portal 到 body 且 body/html 未定位）。把列表放进已定位或带 transform 的祖先里时改用 `fixed`，代价是快速滚动时有一帧滞后与抖动。

## 表单接入

给了 `name` 或 `form`、或触发器在 `<form>` 内时，会渲染一个隐藏的原生 `<select>`，选项与注册表同源：

- `FormData` 与 `form.addEventListener('change')` 都能看到变化——值走 `HTMLSelectElement.prototype` 上的原始 setter 写入，再派发一次冒泡 `change`，绕开表单库在实例上覆盖的 setter。
- `required` 落在原生 select 上，因此浏览器的必填校验与错误气泡都指向触发器。
- `form.reset()` 会把组件状态与原生值一起恢复到初次出现时的选中值。

它是触发按钮的**兄弟节点**而不是子节点：`<button>` 内不允许再放交互元素。成品层的外壳 `<span class="y-select">` 提供 `position: relative`，让它靠绝对定位覆盖在按钮上；`pointer-events: none` 保证点击照旧落在按钮上。

清除按钮同理，也是兄弟节点。

## 无障碍行为

| 项       | 说明                                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 角色     | 触发器 `combobox`，列表 `listbox`，选项 `option`，分组 `group`，分隔 `separator`                                                    |
| 关联     | `aria-controls` 指向列表；打开时额外用 `aria-owns` 声明 portal 出去的子树                                                           |
| 高亮     | `aria-activedescendant` 指向高亮项，焦点不移进浮层                                                                                  |
| 选中     | 选项的 `aria-selected`；标记本身 `aria-hidden`，不重复播报                                                                          |
| 占位     | `data-placeholder` 供样式层调色，选中语义仍由 `aria-*` 表达                                                                         |
| 禁用     | 整体禁用输出原生 `disabled` + `aria-disabled`；单项禁用只有 `aria-disabled`，因此点击仍会被派发并在逻辑层拦下                       |
| 减少动效 | 进出场只压缩时长而不是 `animation: none`——Presence 靠 `animationend` 决定隐藏时机；spinner 改成慢速旋转，停转会让加载态看起来像卡死 |

## 与 Radix 的差异

| 项目     | Radix                                    | 本库                                                       |
| -------- | ---------------------------------------- | ---------------------------------------------------------- |
| 焦点     | 打开时把焦点移进列表，用 FocusScope 陷阱 | 焦点留在触发器，用 `aria-activedescendant`，无需陷阱       |
| 挂载     | 关闭时卸载列表                           | 首次打开才挂载，之后**常驻不销毁**，关闭靠 closed 状态隐藏 |
| 定位     | 依赖 `@floating-ui/dom`                  | 自建 `primitives/floating`，零外部运行时依赖               |
| 滚动     | 上下滚动按钮                             | 视口原生滚动 + 高亮跟随，最大高度受可用空间限制            |
| 选中回显 | 把选中项文本 portal 进触发器             | 选项注册表常驻，回显直接查表                               |

**回显与首字搜索不依赖 DOM 挂载**：选项注册表由无头层的持久快照缓存承担，关闭态（乃至首次打开前）触发器回显与 typeahead 都查得到完整选项。DOM 层面的常驻则由 `keepMounted` 决定：缺省打开过一次之后不销毁，列表滚动位置与临时状态留得住；关掉它回到「关闭即卸载」也不丢回显与搜索。常驻时关闭的可见性由样式层的 `closed` 状态负责。

## 已知限制

- **单选**。多选与标签输入不在本组件语义内，需要时另起组件，而不是给 `value` 加数组形态。
- **不做虚拟滚动**。选项很多时注册表与 DOM 都是全量的；虚拟滚动需要「可见项才登记」的接口，等真实场景出现再加。
- **首字搜索不做拼音匹配**。匹配的是渲染出来的文本，中文选项按中文首字；需要拼音时由消费者把拼音写进 `textValue`。
- **无样式层自行组合时，隐藏原生 select 的定位祖先要自己给**。成品层的外壳提供了 `position: relative`；直接用 `SelectTrigger` 时若没有定位祖先，原生校验气泡会指到别处（提交与校验本身仍然正确）。
- **文案不做本地化**。`placeholder`、`clearLabel` 与空态文案都是属性或插槽，由消费者提供。
