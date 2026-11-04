# Dialog 组件四层架构原型说明

## 文件清单

### Primitives 层（框架无关内核）

| 文件 | 职责 |
|---|---|
| `packages/primitives/src/dialog/types.ts` | 状态、动作、配置、键盘上下文的纯类型定义 |
| `packages/primitives/src/dialog/machine.ts` | `createDialogMachine()` 状态机工厂 + `handleDialogKeydown()` 纯键盘处理 |
| `packages/primitives/src/dialog/index.ts` | 统一导出入口 |

### Headless 层（Vue Composable 适配）

| 文件 | 职责 |
|---|---|
| `packages/headless/src/useDialog/types.ts` | `UseDialogOptions` / `UseDialogReturn` 接口定义 |
| `packages/headless/src/useDialog/useDialog.ts` | `useDialog()` Composable，桥接状态机到 Vue 响应式 |
| `packages/headless/src/useDialog/index.ts` | 统一导出入口 |

### UI 层（无样式复合组件）

| 文件 | 职责 |
|---|---|
| `packages/ui/src/Dialog/DialogRoot.vue` | 上下文提供者，创建 Composable 并 provide |
| `packages/ui/src/Dialog/DialogTrigger.vue` | 触发按钮，绑定 aria-haspopup / aria-expanded |
| `packages/ui/src/Dialog/DialogOverlay.vue` | 遮罩层，点击关闭逻辑 |
| `packages/ui/src/Dialog/DialogContent.vue` | 内容容器，role="dialog" + Teleport + 自动聚焦 |
| `packages/ui/src/Dialog/DialogTitle.vue` | 标题，aria-labelledby 关联 |
| `packages/ui/src/Dialog/DialogDescription.vue` | 描述，aria-describedby 关联 |
| `packages/ui/src/Dialog/DialogClose.vue` | 关闭按钮 |
| `packages/ui/src/Dialog/index.ts` | 统一导出入口 |

### Components 层（带样式组件）

| 文件 | 职责 |
|---|---|
| `packages/components/src/Dialog/Dialog.scss` | BEM 样式 + 组件级 CSS Variables + reduced-motion |
| `packages/components/src/Dialog/Dialog.vue` | 封装 UI 复合组件 + 注入样式 |
| `packages/components/src/Dialog/index.ts` | 统一导出入口 |

---

## 分层依赖关系

```text
components/Dialog.vue
  ├─ import from @agile-plus/ui/dialog      ← UI 层复合组件
  └─ import from @agile-plus/headless        ← 类型引用（props 透传）

ui/Dialog*.vue
  ├─ inject('dialog')                  ← 从 DialogRoot 获取 Composable 实例
  └─ import type from @agile-plus/headless   ← 仅类型依赖

headless/useDialog.ts
  ├─ import from @agile-plus/primitives/dialog ← 状态机 + 键盘处理
  └─ import from vue                     ← ref/computed/watch/onUnmounted

primitives/dialog/*
  └─ 无任何外部依赖                      ← 纯 TypeScript
```

---

## 各层消费方式

### 1. 仅使用 Primitives（框架无关 / 自定义框架适配）

```ts
import { createDialogMachine, handleDialogKeydown } from '@agile-plus/primitives/dialog';

const machine = createDialogMachine({ defaultOpen: false });

machine.subscribe((state) => {
  console.log('Dialog state:', state);
});

machine.send({ type: 'OPEN' });

// 键盘事件处理（纯函数，不操作 DOM）
const result = handleDialogKeydown('Escape', {
  isOpen: true,
  canCloseOnEscape: true,
});

if (result.shouldClose) {
  machine.send({ type: 'CLOSE' });
}
```

### 2. 使用 Headless Composable（自定义 UI 结构）

```vue
<script setup lang="ts">
import { useDialog } from '@agile-plus/headless';

const { isOpen, open, close, getTriggerProps, getContentProps, getOverlayProps } =
  useDialog({ defaultOpen: false, closeOnEscape: true });
</script>

<template>
  <button v-bind="getTriggerProps()">打开对话框</button>

  <div v-if="isOpen">
    <div v-bind="getOverlayProps()" class="my-overlay" />
    <div v-bind="getContentProps()" class="my-content">
      <p>完全自定义的结构和样式</p>
      <button @click="close">关闭</button>
    </div>
  </div>
</template>
```

### 3. 使用 UI 层复合组件（无样式 + WAI-ARIA）

```vue
<script setup lang="ts">
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogOverlay,
} from '@agile-plus/ui/dialog';
</script>

<template>
  <DialogRoot v-model:open="visible">
    <DialogTrigger>打开</DialogTrigger>

    <DialogOverlay />

    <DialogContent>
      <DialogTitle>确认删除</DialogTitle>
      <DialogDescription>此操作不可撤销。</DialogDescription>

      <button @click="doConfirm">确认</button>
      <DialogClose>取消</DialogClose>
    </DialogContent>
  </DialogRoot>
</template>

<!-- 消费者自行提供所有样式 -->
<style scoped>
[data-part='overlay'] { position: fixed; inset: 0; background: rgba(0,0,0,0.5); }
[data-part='content'] { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); }
</style>
```

### 4. 使用 Components 层（开箱即用）

```vue
<script setup lang="ts">
import { Dialog } from '@agile-plus/components';

const visible = ref(false);
</script>

<template>
  <Dialog v-model:open="visible">
    <template #trigger>删除记录</template>
    <template #title>确认删除</template>
    <template #description>此操作不可撤销，是否继续？</template>

    <button @click="confirmDelete">确认删除</button>
  </Dialog>
</template>
```

---

## 关键设计决策说明

### 为什么 Primitives 用订阅模式而非回调

状态机的 `subscribe` 模式使 Headless 层可以用一行代码桥接到任何响应式系统：

```ts
// Vue
const unsubscribe = machine.subscribe((state) => { internalOpen.value = state.open; });

// React（未来适配）
const [state, setState] = useState(machine.getState());
useEffect(() => machine.subscribe(setState), []);

// Svelte（未来适配）
const store = writable(machine.getState());
machine.subscribe(store.set);
```

如果直接用回调，每个框架适配层都需要重新包装状态同步逻辑。

### 为什么 UI 层用 provide/inject 而非 props drilling

复合组件的子组件（Trigger、Content、Close）需要共享同一个 Composable 实例。如果用 props 逐层传递：

- 消费者必须在每一层手动传递大量 props。
- 新增子组件时需要修改所有中间层的 props 接口。
- 插槽中的子组件无法接收 props（Vue 插槽作用域限制）。

provide/inject 让子组件无论嵌套多深都能直接获取上下文，且不影响消费者的模板结构。

### 为什么 get*Props 返回 Record<string, unknown> 而非具体类型

返回宽泛类型是为了兼容 Vue 的 `v-bind`：

```vue
<!-- v-bind 接受任意键值对 -->
<button v-bind="getTriggerProps()">...</button>
```

如果使用严格的 HTMLAttributes 类型，事件处理器（onClick、onKeydown）的类型会与 Vue 的事件绑定签名不完全匹配，导致类型错误。Headless 层的返回值是"属性集合"而非"HTML 属性"，语义上更准确。

### 为什么 Components 层仍然暴露复合组件 API

即使带样式组件也可以让消费者选择使用简化 API 或完整复合组件 API：

```vue
<!-- 简化用法 -->
<Dialog v-model:open="visible" title="确认" description="确定吗？">
  <template #trigger>打开</template>
</Dialog>

<!-- 完整控制 -->
<Dialog v-model:open="visible">
  <Dialog.Trigger>打开</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Title>确认</Dialog.Title>
    <Dialog.Description>确定吗？</Dialog.Description>
    <custom-action-buttons />
  </Dialog.Content>
</Dialog>
```

当前原型展示了完整控制用法。简化用法可通过在 Components 层增加 props + 条件渲染实现，不影响底层架构。

---

## 待完善项

以下能力在当前原型中未实现，应在后续迭代中补充：

1. **Focus Trap**：DialogContent 打开时应将焦点限制在对话框内，关闭时恢复触发元素焦点。建议在 Headless 层抽取 `useFocusTrap` Composable。
2. **Scroll Lock**：对话框打开时应锁定背景滚动。建议在 Headless 层抽取 `useScrollLock` Composable。
3. **Transition 动画**：UI 层应支持 `<Transition>` 包裹以实现进入/离开动画。
4. **Portal 目标可配置**：Teleport 的 `to` 属性应支持 props 配置，而非硬编码 `"body"`。
5. **单元测试**：Primitives 层应有纯状态机测试，Headless 层应有 Composable 测试（@vue/test-utils），UI 层应有无障碍属性断言测试。
6. **ID 稳定性**：当前 primitives 使用全局递增计数器生成 ID，SSR 环境下可能不一致。应改为支持外部传入或使用框架感知的 useId。
