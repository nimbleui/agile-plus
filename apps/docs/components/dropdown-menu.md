<script setup>
import DropdownMenuDemo from '../.vitepress/components/DropdownMenuDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# DropdownMenu 下拉菜单

点击触发的操作菜单，对应 Radix / Reka 的 DropdownMenu。四层实现：`headless/useDropdownMenu` 持有开合、定位、项注册表与键盘导航；`ui/dropdown-menu` 提供 ARIA 结构与 portal；`components/dropdown-menu` 注入样式。

**浮层内容的挂载时机**：首次打开才挂载（`usePresence` 的 v-if）；打开过一次之后**常驻不销毁**——成品层 `keepMounted` 默认为真，关闭只剩 `data-state="closed"` 加样式隐藏，菜单里的滚动位置与临时状态都留得住。要旧的「关闭即卸载」就传 `:keep-mounted="false"`；`ui` 层与无头层默认不常驻，常驻判定在 `headless/useKeepMounted`。

## 基础示例

<Preview description="分组标题 / 分隔线 / 禁用项；键盘 ↑↓ / Enter / Esc；item-select 读out。">
  <DropdownMenuDemo />
</Preview>

```vue
<script setup lang="ts">
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@agile-plus/components/dropdown-menu';
</script>

<template>
  <DropdownMenu @item-select="(id) => console.log(id)">
    <template #trigger>操作</template>
    <DropdownMenuLabel>文件</DropdownMenuLabel>
    <DropdownMenuItem value="edit">编辑</DropdownMenuItem>
    <DropdownMenuItem value="copy">复制</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem value="delete" disabled>删除</DropdownMenuItem>
  </DropdownMenu>
</template>
```

## 键盘交互

| 按键                                 | 行为                         |
| ------------------------------------ | ---------------------------- |
| `↓` / `Enter` / `Space`（触发器）    | 打开并高亮首项               |
| `↑`（触发器）                        | 打开并高亮末项               |
| `↓` / `↑` / `Home` / `End`（菜单内） | 移动高亮（跳过禁用，可循环） |
| `Enter` / `Space`（菜单内）          | 选中高亮项并关闭             |
| `Escape` / `Tab` / 外部点击          | 关闭                         |

## 无障碍

- 触发器 `aria-haspopup="menu"`、`aria-expanded`；菜单 `role="menu"`、`aria-activedescendant` 指向高亮项。
- 项 `role="menuitem"`、`aria-disabled`；焦点留在菜单容器，项不可聚焦。
- 关闭时若焦点曾在菜单内则交还触发器。

## 已知限制

- 不做嵌套子菜单；需要级联时另行组合。
- 常驻之后关闭不卸载，隐藏完全由样式层的 `closed` 状态负责。只用 `ui` 层又自己开了 `keepMounted` / `forceMount`，就得自己做可见性切换，否则菜单会一直露出来。
