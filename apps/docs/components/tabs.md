<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import TabsDemo from '../.vitepress/components/TabsDemo.vue';
</script>

# Tabs 标签页

在一组面板之间切换。实现 roving tabindex、方向键导航、`automatic` 与 `manual` 两种激活模式，以及水平与垂直两个方向。

## 基础示例

<Preview description="使用方向键在标签间移动焦点，automatic 模式下焦点移动即激活面板；Home / End 跳转首尾。">
  <TabsDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Tabs } from '@agile-plus/components/tabs';
import { TabsContent, TabsList, TabsTrigger } from '@agile-plus/ui/tabs';

const active = ref('basic');
</script>

<template>
  <Tabs v-model="active">
    <TabsList class="y-tabs">
      <TabsTrigger value="basic" class="y-tabs__trigger">基础配置</TabsTrigger>
      <TabsTrigger value="advanced" class="y-tabs__trigger">高级配置</TabsTrigger>
    </TabsList>

    <TabsContent value="basic" class="y-tabs">基础面板</TabsContent>
    <TabsContent value="advanced" class="y-tabs">高级面板</TabsContent>
  </Tabs>
</template>
```

带样式的 `Tabs` 只封装根节点，列表与面板仍来自 `@agile-plus/ui/tabs` 并需要显式传入样式 class——这是无头层的契约：样式类名由消费者决定。

## Tabs

### Props

| 属性             | 类型                         | 默认值         | 说明                                             |
| ---------------- | ---------------------------- | -------------- | ------------------------------------------------ |
| `modelValue`     | `string`                     | `undefined`    | 受控激活值，传入后进入受控模式                   |
| `defaultValue`   | `string`                     | `''`           | 非受控模式的初始激活值；为空时取第一个注册的 tab |
| `activationMode` | `'automatic' \| 'manual'`    | `'automatic'`  | 焦点移动是否直接激活面板                         |
| `orientation`    | `'horizontal' \| 'vertical'` | `'horizontal'` | 布局方向，决定方向键映射                         |
| `onValueChange`  | `(value: string) => void`    | `undefined`    | 激活值变化回调                                   |

### Events

| 事件                | 参数            | 说明                |
| ------------------- | --------------- | ------------------- |
| `update:modelValue` | `value: string` | 配合 `v-model` 使用 |

## 子组件

| 组件          | 必填 Props      | 渲染                                                |
| ------------- | --------------- | --------------------------------------------------- |
| `TabsList`    | 无              | `<div role="tablist">`，`aria-orientation` 跟随方向 |
| `TabsTrigger` | `value: string` | `<button role="tab">`                               |
| `TabsContent` | `value: string` | `<div role="tabpanel">`，未激活时带 `hidden`        |

`TabsTrigger` 与 `TabsContent` 通过相同的 `value` 建立 `aria-controls` / `aria-labelledby` 关联。

## 两种激活模式

```ts
// automatic：方向键移动焦点即激活面板（WAI-ARIA 推荐默认）
// manual：方向键仅移动焦点，需按 Enter 或 Space 才激活
<Tabs v-model="active" activation-mode="manual">
```

`manual` 模式下 `focusedValue` 与 `activeValue` 分离，用户可以在不切换面板的情况下浏览标签。

## 键盘交互

| 按键                       | horizontal | vertical | 行为                          |
| -------------------------- | ---------- | -------- | ----------------------------- |
| `ArrowLeft` / `ArrowUp`    | ✓ / ✓      | 互换     | 移动到上一个，到达边界循环    |
| `ArrowRight` / `ArrowDown` | ✓ / ✓      | 互换     | 移动到下一个，到达边界循环    |
| `Home`                     | ✓          | ✓        | 移动并激活第一个              |
| `End`                      | ✓          | ✓        | 移动并激活最后一个            |
| `Enter` / `Space`          | ✓          | ✓        | `manual` 模式下激活当前聚焦项 |

焦点采用 roving tabindex：同一时刻只有激活项 `tabindex="0"`，其余为 `-1`，保证 Tab 键一次进入 tablist、一次离开。

## useTabs

```ts
import { useTabs } from '@agile-plus/headless';

const { activeValue, setActive, getTabListProps, getTriggerProps, getContentProps } = useTabs({
  defaultValue: 'a',
});
```

| 返回值                    | 类型                             | 说明                                     |
| ------------------------- | -------------------------------- | ---------------------------------------- |
| `activeValue`             | `Ref<string>`                    | 当前激活值                               |
| `setActive(value)`        | `(value: string) => void`        | 切换激活项                               |
| `registerTab(value)`      | `(value: string) => void`        | 注册标签，顺序即导航顺序，重复注册幂等   |
| `unregisterTab(value)`    | `(value: string) => void`        | 注销标签，若注销的是激活项则回退到第一项 |
| `getTabListProps()`       | `Record<string, unknown>`        | ARIA 属性，绑定到列表容器                |
| `getTriggerProps(value)`  | `Record<string, unknown>`        | ARIA 属性，绑定到标签按钮                |
| `getContentProps(value)`  | `Record<string, unknown>`        | ARIA 属性，绑定到面板                    |
| `onTriggerKeydown(event)` | `(event: KeyboardEvent) => void` | 绑定到标签按钮的 `@keydown`              |

`get*Props` 只返回可 `v-bind` 的属性，事件通过 `v-on` 单独绑定；点击激活直接复用 `setActive`：

```vue
<button
  v-bind="getTriggerProps(value)"
  @click="setActive(value)"
  @keydown="onTriggerKeydown"
>
```

注册副作用被刻意从 `getTriggerProps` 中分离：该函数需要放进 `computed` 随状态重新求值，若内部包含状态写入会触发递归更新。

## 无障碍行为

| 项       | 实现                                                |
| -------- | --------------------------------------------------- |
| 结构     | `role="tablist"` / `role="tab"` / `role="tabpanel"` |
| 选中状态 | `aria-selected`                                     |
| 面板关联 | `tab.aria-controls` ↔ `tabpanel.id`                 |
| 标签关联 | `tabpanel.aria-labelledby` ↔ `tab.id`               |
| 隐藏方式 | 未激活面板使用 `hidden` 属性而非 `display: none` 类 |
| 键盘     | 完整 roving tabindex + 方向键 + Home/End            |

## 样式钩子

```text
.y-tabs[data-part='list']      标签列表容器
.y-tabs__trigger               标签按钮（aria-selected='true' 为激活态）
.y-tabs[data-part='content']   面板
```

组件级 CSS Variables：`--y-tabs-trigger-color`、`--y-tabs-trigger-active-color`、`--y-tabs-trigger-hover-bg`、`--y-tabs-trigger-padding`、`--y-tabs-trigger-radius`、`--y-tabs-indicator-color`、`--y-tabs-indicator-height`、`--y-tabs-content-padding`。

激活指示条由 `::after` 伪元素实现，不额外渲染 DOM 节点。

## 已知限制

- `data-state` 表达 `active` / `inactive`，与 Dialog 的 `open` / `closed` 不统一，尚未收敛为共享状态词表。
- 面板内容始终挂载（仅通过 `hidden` 隐藏），不支持延迟挂载与卸载。
- 未实现标签溢出时的滚动或折叠处理。

## Primitives 层

```ts
import { createTabsMachine, handleTabsKeydown } from '@agile-plus/primitives/tabs';

const machine = createTabsMachine({ defaultValue: 'a', orientation: 'horizontal' });

machine.send({ type: 'REGISTER_TAB', payload: 'a' });
machine.send({ type: 'NAVIGATE_NEXT' });

const { nextFocusedValue, shouldActivate, handled } = handleTabsKeydown('ArrowRight', {
  tabValues: ['a', 'b', 'c'],
  focusedValue: 'a',
  orientation: 'horizontal',
  loop: true,
});
```

`TabsAction` 覆盖 `SET_ACTIVE` / `REGISTER_TAB` / `UNREGISTER_TAB` / `FOCUS_TAB` / `NAVIGATE_NEXT` / `NAVIGATE_PREV` / `NAVIGATE_FIRST` / `NAVIGATE_LAST` / `ACTIVATE_FOCUSED`。
