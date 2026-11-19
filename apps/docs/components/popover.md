<script setup>
import PopoverDemo from '../.vitepress/components/PopoverDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# Popover 气泡卡片

点击触发的非模态浮层，承载富内容（表单、说明、操作）。四层实现：`headless/usePopover` 持有开合与定位、外部点击 / Escape 关闭、焦点交还；`ui/popover` 提供 ARIA 结构与 portal；`components/popover` 注入样式。

**浮层内容的挂载时机**：首次打开才挂载（`usePresence` 的 v-if）；打开过一次之后**常驻不销毁**——成品层 `keepMounted` 默认为真，关闭只剩 `data-state="closed"` 加样式隐藏，浮层里的滚动位置与临时状态都留得住。要旧的「关闭即卸载」就传 `:keep-mounted="false"`；`ui` 层与无头层默认不常驻，常驻判定在 `headless/useKeepMounted`。

## 基础示例

<Preview description="切换位置、开合读出、浮层内交互按钮；打开过一次之后常驻不销毁。">
  <PopoverDemo />
</Preview>

```vue
<script setup lang="ts">
import { Popover } from '@agile-plus/components/popover';
</script>

<template>
  <Popover placement="bottom">
    <template #trigger>更多</template>
    <p>浮层正文，首次打开前不在 DOM，之后常驻。</p>
  </Popover>
</template>
```

## 成品层 Props

| 属性                    | 类型                       | 默认值      | 说明                                         |
| ----------------------- | -------------------------- | ----------- | -------------------------------------------- |
| `open` / `v-model:open` | `boolean`                  | `undefined` | 受控开合                                     |
| `defaultOpen`           | `boolean`                  | `false`     | 非受控初值                                   |
| `placement`             | `FloatingPlacement`        | `'bottom'`  | 期望位置                                     |
| `offset`                | `number \| FloatingOffset` | `8`         | 与触发器间距                                 |
| `flip` / `shift`        | `boolean`                  | `true`      | 翻转 / 交叉轴钳制                            |
| `padding`               | `number`                   | `8`         | 边界留白                                     |
| `strategy`              | `'fixed' \| 'absolute'`    | `'fixed'`   | 定位策略                                     |
| `container`             | `string \| HTMLElement`    | `'body'`    | portal 目标                                  |
| `keepMounted`           | `boolean`                  | `true`      | 打开过一次之后常驻 DOM；关掉即回到关闭即卸载 |
| `triggerAsChild`        | `boolean`                  | `false`     | 触发器不渲染 button                          |

事件：`update:open`。插槽：`trigger`、默认（浮层正文）。

## 无障碍与焦点

- 触发器 `aria-haspopup="dialog"`、`aria-expanded`、打开时 `aria-controls`。
- 浮层 `role="dialog"`、`aria-labelledby` 指向触发器；打开时焦点移入，关闭时若焦点曾在浮层内则交还触发器。
- 非模态：不锁滚动、不做焦点陷阱；外部指针按下与 Escape 关闭。

## 已知限制

- 不做焦点陷阱：浮层内 Tab 可走出组件（非模态语义）。
- 常驻之后关闭不卸载，隐藏完全由样式层的 `closed` 状态负责。只用 `ui` 层又自己开了 `keepMounted` / `forceMount`，就得自己做可见性切换，否则浮层会一直露出来。
- 关掉 `keepMounted` 回到懒渲染时，浮层内状态（如未提交表单）关闭即丢失；需保留时把状态提升到外部，或保持缺省常驻。
