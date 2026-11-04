# 快速开始

## 环境要求

- Node.js >= 18（本仓库开发使用 22.21.1）
- pnpm >= 9

## 安装依赖与构建

```bash
pnpm install
pnpm build
```

`pnpm build` 按依赖拓扑顺序构建 `@agile-plus/primitives` → `@agile-plus/headless` → `@agile-plus/ui` → `@agile-plus/components`。

## 本地预览文档站

```bash
pnpm --filter @agile-plus/docs dev
```

文档站将 workspace 包 alias 到源码，修改组件实现后页面即时热更新，无需重新构建 dist。

## 选择你的消费层级

### 只要逻辑（自定义渲染 / 状态受控）

```ts
import { createTabsMachine, handleTabsKeydown } from '@agile-plus/primitives/tabs';

const machine = createTabsMachine({ defaultValue: 'a', activationMode: 'automatic' });

machine.send({ type: 'REGISTER_TAB', payload: 'a' });
machine.subscribe((state) => console.log(state.activeValue));
```

### 用 Composable 自己写结构

```vue
<script setup lang="ts">
import { useDialog } from '@agile-plus/headless';

const { isOpen, open, close, getTriggerProps, getContentProps } = useDialog();
</script>

<template>
  <button v-bind="getTriggerProps()">打开</button>

  <Teleport to="body">
    <div v-if="isOpen" v-bind="getContentProps()">
      <p>完全自定义的结构与样式</p>
      <button @click="close">关闭</button>
    </div>
  </Teleport>
</template>
```

### 用无样式组件（需要 ARIA 与键盘交互）

```vue
<script setup lang="ts">
import { DialogRoot, DialogTrigger, DialogContent } from '@agile-plus/ui/dialog';
</script>

<template>
  <DialogRoot v-model:open="visible">
    <DialogTrigger>打开</DialogTrigger>

    <DialogContent>
      <button @click="visible = false">关闭</button>
    </DialogContent>
  </DialogRoot>
</template>
```

### 用带样式组件（开箱即用）

```vue
<script setup lang="ts">
import { Dialog } from '@agile-plus/components/dialog';
import '@agile-plus/components/style.css';
</script>

<template>
  <Dialog v-model:open="visible">
    <template #trigger>打开对话框</template>
    <template #title>标题</template>
    <template #description>描述</template>
  </Dialog>
</template>
```

从主入口 `@agile-plus/components` 引入时会自动带上 Design Token；只引子路径时需手动引入 `@agile-plus/components/style.css`。

## 编写组件样式

组件样式统一从样式入口获取能力：

```scss
@use '../styles' as *;

@include b('button') {
  @include set-component-css-var(
    'button',
    (
      'color': getCssVar('color-primary'),
      'radius': getCssVar('border-radius'),
    )
  );

  color: getCssVar('button', 'color');
  border-radius: getCssVar('button', 'radius');

  @include focus-ring();

  @include reduced-motion {
    transition: none;
  }
}
```

可用能力：`b()` `e()` `m()` `when()` 命名空间、`getCssVar()`、`set-component-css-var()`、`solid-interactions()`、`light-interactions()`、`focus-ring()`、`reduced-motion`。

## 新增一个组件

按以下顺序垂直打通，再横向扩展：

1. `primitives/src/<name>/types.ts` — 定义状态、动作、配置类型。
2. `primitives/src/<name>/machine.ts` — 纯状态机，写单元测试。
3. `headless/src/use<Name>/` — Composable 桥接，受控与非受控双模式。
4. `ui/src/<Name>/` — 复合组件，补齐 WAI-ARIA 与键盘交互。
5. `components/src/<Name>/` — SCSS 使用 BEM + 组件级变量 + Design Token。
6. 更新四个包的 `index.ts`、构建配置 `entry` 与 `package.json` 的 `exports`。
7. `pnpm build && pnpm --filter @agile-plus/docs dev` 在浏览器中验证真实交互。

## 常用命令

| 命令                                   | 说明            |
| -------------------------------------- | --------------- |
| `pnpm build`                           | 构建全部包      |
| `pnpm --filter @agile-plus/docs dev`   | 启动文档站      |
| `pnpm --filter @agile-plus/docs build` | 构建文档站      |
| `pnpm typecheck`                       | 各包类型检查    |
| `pnpm test`                            | 运行测试        |
| `pnpm format`                          | Prettier 格式化 |
