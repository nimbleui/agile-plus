# 无头组件库架构设计文档

## 1. 概述

### 1.1 设计目标

构建一套分层清晰、框架解耦、可渐进式消费的无头组件体系，参照 Radix UI 的分层哲学，适配 Vue 3 + TypeScript + pnpm Monorepo 技术栈。

核心诉求：

- **逻辑与视图彻底分离**：状态机、算法、协议不依赖任何框架 API。
- **无障碍优先**：WAI-ARIA 属性、键盘导航、焦点管理作为一等公民内置于无样式层。
- **样式完全可选**：消费者可在任意层级接入，从纯逻辑到开箱即用的带样式组件。
- **主题化能力**：样式层通过 Design Token + CSS Variables 实现多主题切换，不绑定具体色值。
- **长期可维护**：公共 API 稳定、内部实现可调、禁止反向依赖、避免过早抽象。

### 1.2 适用范围

本文档适用于以下场景的架构决策与开发指导：

- 新增基础交互组件（Dialog、Select、Tabs、Popover、Dropdown、Tooltip、Switch、Checkbox、Radio、Accordion 等）。
- 重构现有组件以符合分层规范。
- 评估第三方库是否可被内部无头体系替代。
- Code Review 时判断修改是否破坏分层边界。

### 1.3 不适用场景

- 纯业务功能模块（订单、用户中心等），应直接消费 `@agile-plus/components`。
- 纯后端服务或 Node.js 工具链。
- 非 Vue 技术栈的项目（primitives 层可复用，但 headless/ui 层需重新适配）。

---

## 2. 分层架构

### 2.1 四层模型

```text
┌─────────────────────────────────────────────────────┐
│              @agile-plus/components                       │
│   带样式组件 · Design Token · BEM · 主题化          │
├─────────────────────────────────────────────────────┤
│              @agile-plus/ui                               │
│   无样式组件 · WAI-ARIA · 键盘交互 · Slots 契约     │
├─────────────────────────────────────────────────────┤
│              @agile-plus/headless                         │
│   Vue Composables · 响应式桥接 · 生命周期 · DOM 绑定│
├─────────────────────────────────────────────────────┤
│              @agile-plus/primitives                       │
│   框架无关内核 · 状态机 · 纯计算 · 稳定协议         │
└─────────────────────────────────────────────────────┘
```

依赖方向严格单向：`components → ui → headless → primitives`。禁止反向依赖与循环依赖。

跨层向下引用不在这条禁令之内：只要经包的公开出口（如 `@agile-plus/primitives/slider`），UI 层可以直接消费 Primitives。原因是这层的属性映射与几何计算两类 API 没有需要响应式包装的状态，强行绕经 Headless 只会多出一层不做任何事的转发。真正被禁止的是低层引用高层，以及引用未从包出口导出的内部路径（见 3.3、6.3）。

### 2.2 各层职责详解

#### 2.2.1 Primitives 层

**定位**：框架无关的纯逻辑内核。

**包含内容**：

- 状态机定义（`createXxxMachine()`）
- 纯计算函数（几何计算、过滤算法、排序逻辑）
- 数据结构与类型定义
- 稳定协议（事件格式、状态形状、回调签名）
- 键盘映射常量与解析器

**约束**：

- 禁止导入 Vue、React 或任何框架 API。
- 禁止使用响应式原语（`ref`、`reactive`、`watch`）。
- 禁止主动去找元素、注册监听或订阅生命周期：全层没有 `querySelector`、`addEventListener`，也没有一次 `setTimeout` 调用（Toast 的自动关闭只存 `startedAt` 与 `remaining` 两个数，时间戳由调用方注入，所以暂停与恢复能在 node 环境下直接断言，不依赖 fake timers）。要操作谁，一律由调用方作为参数传进来，这层自己永远不主动取。
- 所有导出必须有明确 TypeScript 类型和 JSDoc 注释。
- 测试必须是纯单元测试，无需 mount 组件。

**允许存在的 DOM 触点**：接收传入的元素，就地读一次或写一次，不缓存引用、不遍历文档全局。当前只有三处：

| 模块 | 函数 | 用到什么 |
| --- | --- | --- |
| `dom/tabbable` | `getTabbableCandidates` `focusFirst` | 以传入容器为根遍历子树；`focus()` 后读 `document.activeElement` 判断焦点是否真的落下 |
| `form/hidden-input` | `writeNativeChecked` | 取 `window.HTMLInputElement.prototype` 上的原生 setter 写 `checked`（带 SSR 回退），绕开框架对值的接管 |
| `toast/announce` | `getToastAnnounceTextContent` | 按文档顺序读传入容器的文本片段 |

这条界线可以机械验证：13 个测试文件里 9 个声明 `// @vitest-environment node` 并在完全没有 DOM 的环境下跑通，上面三处所在模块（`dom` `form` `toast`）的测试才需要 DOM。所以判断新逻辑能不能进这层，先问一句「把它丢进 node 环境跑，会不会因为自己要去取元素而失败」——会因为调用方传了元素而失败是允许的。

注意 `focusFirst` 与 `writeNativeChecked` 确实改变了 DOM 状态，这与「不操作 DOM」的字面表述冲突，但不是越界：转换规则仍在这层（可单测、可跨框架复用），**何时**执行由上层决定。Headless 层负责的是「在哪一次点击或哪一个生命周期里调它」。

**示例导出**：

```ts
// @agile-plus/primitives/dialog
export interface DialogState {
  /** 对话框是否打开 */
  open: boolean;
  /** 触发元素的唯一 ID，用于 aria-labelledby 关联 */
  triggerId: string;
  /** 内容区域的唯一 ID，用于 aria-describedby 关联 */
  contentId: string;
}

export interface DialogMachineOptions {
  /** 初始打开状态，默认 false */
  defaultOpen?: boolean;
  /** 按 Escape 是否关闭，默认 true */
  closeOnEscape?: boolean;
  /** 点击遮罩是否关闭，默认 true */
  closeOnOverlayClick?: boolean;
}

export interface DialogMachine {
  /** 获取当前状态快照 */
  getState(): DialogState;
  /** 发送动作触发状态转换 */
  send(action: DialogAction): void;
  /** 订阅状态变化，返回取消订阅函数 */
  subscribe(listener: (state: DialogState) => void): () => void;
}

/**
 * 创建 Dialog 状态机实例。
 *
 * 该函数保持框架无关，不包含任何 DOM 操作或响应式绑定。
 * 状态转换逻辑集中在此处，便于独立单元测试和跨框架复用。
 */
export function createDialogMachine(options?: DialogMachineOptions): DialogMachine;
```

#### 2.2.2 Headless 层

**定位**：Vue Composables 适配层，将 primitives 桥接到 Vue 响应式系统。

**包含内容**：

- `useXxx` Composables
- 响应式状态包装（`ref`/`computed` 映射 machine state）
- 生命周期协调（`onMounted`/`onUnmounted` 管理资源）
- DOM 事件绑定与清理
- Focus Trap、Scroll Lock 等副作用管理
- Props/Emit 的类型推导辅助

**约束**：

- 不重新实现底层算法，只调用 primitives。
- 返回值只暴露调用方真正需要的 API，隐藏内部 machine 实例。
- 所有 Observer、Listener、Timer 必须在 `onUnmounted` 中清理。
- 不使用 `setTimeout` 掩盖响应式时序问题。
- 命名统一 `useXxx`，文件命名 `useXxx.ts`。

**示例导出**：

```ts
// @agile-plus/headless/useDialog
export interface UseDialogOptions {
  /** 受控打开状态，传入后变为受控模式 */
  open?: boolean;
  /** 非受控模式下的默认打开状态 */
  defaultOpen?: boolean;
  /** 打开状态变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 按 Escape 是否关闭，默认 true */
  closeOnEscape?: boolean;
  /** 点击遮罩是否关闭，默认 true */
  closeOnOverlayClick?: boolean;
}

export interface UseDialogReturn {
  /** 当前是否打开（响应式） */
  isOpen: Ref<boolean>;
  /** 打开对话框 */
  open(): void;
  /** 关闭对话框 */
  close(): void;
  /** 切换打开状态 */
  toggle(): void;
  /** 获取触发元素需要绑定的属性 */
  getTriggerProps(): HTMLAttributes;
  /** 获取内容区域需要绑定的属性 */
  getContentProps(): HTMLAttributes;
  /** 获取遮罩层需要绑定的属性 */
  getOverlayProps(): HTMLAttributes;
}

/**
 * Dialog 的 Vue Composable 适配。
 *
 * 将 primitives 的状态机桥接到 Vue 响应式系统，
 * 并管理 focus trap、escape 监听、scroll lock 等 DOM 副作用的生命周期。
 * 支持受控与非受控两种模式。
 */
export function useDialog(options?: UseDialogOptions): UseDialogReturn;
```

#### 2.2.3 UI 层

**定位**：无样式组件，提供 WAI-ARIA 结构、键盘交互和插槽契约。

**包含内容**：

- Vue SFC 组件（零 class、零 style、零颜色）
- `role`、`aria-*`、`data-state`、`data-disabled` 等属性
- 键盘事件处理（Tab、Arrow、Enter、Space、Escape）
- 具名插槽定义（`#trigger`、`#content`、`#overlay` 等）
- `<Teleport>`、`<Transition>` 等结构性包裹
- 复合组件的子组件（`Dialog.Trigger`、`Dialog.Content`、`Dialog.Close`）

**约束**：

- 禁止任何 CSS 颜色、尺寸、布局、字体、阴影、圆角。
- 禁止硬编码视觉相关 class。
- 所有交互反馈通过 `data-*` 属性暴露，供样式层选择。
- 插槽 props 必须类型安全且有文档。
- 键盘交互必须符合 WAI-ARIA Authoring Practices。

**示例结构**：

```vue
<!-- @agile-plus/ui/Dialog.vue -->
<script setup lang="ts">
import { useDialog } from '@agile-plus/headless';
import type { UseDialogOptions } from '@agile-plus/headless';

const props = withDefaults(defineProps<UseDialogOptions>(), {
  closeOnEscape: true,
  closeOnOverlayClick: true,
});

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const { isOpen, open, close, getTriggerProps, getContentProps, getOverlayProps } =
  useDialog({
    ...props,
    onOpenChange: (value) => emit('update:open', value),
  });

defineExpose({ open, close, isOpen });
</script>

<template>
  <slot name="trigger" v-bind="{ ...getTriggerProps(), open, close }" />

  <Teleport to="body">
    <div v-if="isOpen" data-state="open">
      <div v-bind="getOverlayProps()" data-part="overlay">
        <slot name="overlay" />
      </div>

      <div v-bind="getContentProps()" data-part="content">
        <slot name="content" :close="close" />
      </div>
    </div>
  </Teleport>
</template>
```

#### 2.2.4 Components 层

**定位**：带样式的业务就绪组件，消费 Design Token 和项目样式体系。

**包含内容**：

- SCSS 样式文件（BEM 命名空间 + 组件级 CSS Variables）
- Design Token 消费（通过 `getCssVar()`）
- 尺寸变体、语义变体、状态修饰符
- 交互动画与 reduced-motion 适配
- Focus Ring、Loading Spinner 等视觉反馈
- 图标、前缀后缀等装饰性子元素

**约束**：

- 样式必须通过 `@use '../styles' as *` 入口消费公共能力。
- 使用 `b()/e()/m()/when()` mixin，不手写完整 BEM class。
- 建立组件级 CSS Variables 作为 Token 与样式的隔离层。
- 交互状态复用共享 mixin（`solid-interactions`、`light-interactions`、`focus-ring`）。
- 所有动画必须处理 `prefers-reduced-motion`。
- 禁止 `!important`、深层选择器、JS 完成 CSS 可做的工作。

---

## 3. 包结构与目录约定

### 3.1 Monorepo 布局

```text
root                                    pnpm workspace：packages/* + apps/*
├─ pnpm-workspace.yaml
├─ eslint.config.mjs                    扁平配置，只在 root 一份
├─ tsconfig.base.json                   各包 tsconfig.json extends 它
├─ vitest.config.ts                     全仓单测入口（jsdom + 源码 alias）
├─ scripts/workspace-source-alias.mts    从各包 exports.source 生成 Vite alias
├─ docs/                                本文档与 Dialog 原型稿
│
├─ packages
│  ├─ primitives/src                    目录名用 kebab-case
│  │  ├─ dialog/{types,machine,index}.ts
│  │  ├─ tabs/{types,machine,keyboard,index}.ts
│  │  ├─ slider/{types,value,index}.ts
│  │  ├─ form/{validity,hidden-input,index}.ts    跨组件能力按主题成目录
│  │  ├─ dom/{tabbable,index}.ts                  没有 shared/ 这种万能目录
│  │  └─ index.ts
│  ├─ headless/src                      一个 composable 一个目录
│  │  ├─ useDialog/{types,useDialog,index}.ts
│  │  ├─ utils/                          内部零件，不进公共 API
│  │  │  ├─ useControllable.ts  useCollection.ts  useBubbleInput.ts
│  │  │  ├─ useFocusTrap.ts  useScrollLock.ts  usePointerDrag.ts
│  │  │  └─ useResizeObserver.ts  useFormResetListener.ts  env.ts
│  │  └─ index.ts
│  ├─ ui/src                            目录 PascalCase，文件按部件命名
│  │  ├─ dialog/{DialogRoot,DialogTrigger,DialogOverlay,DialogContent,
│  │  │          DialogTitle,DialogDescription,DialogClose}.vue
│  │  ├─ dialog/{types,index}.ts
│  │  ├─ slot/Slot.ts                   asChild 的共用基元
│  │  ├─ context.ts                     跨层 inject key 登记表
│  │  └─ index.ts
│  ├─ components/src
│  │  ├─ dialog/{Dialog.vue,Dialog.scss,index}.ts
│  │  ├─ styles/{_index,_tokens,_mixins,_bem}.scss
│  │  └─ index.ts
│  └─ materials/src                     低代码物料登记，不含控件实现
│     ├─ protocol.ts                    平台物料协议的最小镜像
│     ├─ define.ts                      清单条目构造器（包内，不对外导出）
│     ├─ manifest.ts                    入口一：纯数据清单，零组件依赖
│     ├─ index.ts                       入口二：物料名 → 组件名字表
│     ├─ styled/{components,materials,materials-composite}.ts
│     └─ atoms/{components,materials,materials-composite,materials-controls,materials}.ts
│
└─ apps/docs                            VitePress 文档站，目前唯一的 app
   ├─ .vitepress/{config.mts,theme/,components/}
   ├─ guide/                            架构说明与快速开始
   └─ components/                       逐组件文档与可交互示例
```

每个包根固定有 `package.json`、`tsconfig.json`、`README.md`、`LICENSE`。构建配置按包的能力分：`primitives` `headless` `ui` `components` 用 `tsup.config.ts`，涉及 SFC 的 `ui` `components` 与产物为 ESM 单入口的 `materials` 另配 `vite.config.ts`。测试放在包根的 `__tests__/` 而不是 `src/` 内，因此不会进产物。

**没有 `internal/` 工程配置包**：lint、tsconfig、vitest 三件都收在 root。内部配置包要在「多份配置互相冲突」或「外部要复用同一套规则」时才值得拆，现在两者都不成立。

### 3.2 Package.json 关键字段

每个包的 `package.json` 必须声明：

```jsonc
{
  "name": "@agile-plus/primitives",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./dialog": {
      "types": "./dist/dialog/index.d.ts",
      "import": "./dist/dialog/index.mjs",
      "require": "./dist/dialog/index.cjs"
    }
  },
  "files": ["dist"],
  "sideEffects": false
}
```

支持子路径导出（`@agile-plus/primitives/dialog`），允许消费者按需引入单个组件的逻辑，避免全量打包。

### 3.3 公共出口规范

每个包通过 `src/index.ts` 统一导出：

```ts
// packages/primitives/src/index.ts
export * from './dialog';
export * from './select';
export * from './tabs';
export * from './shared';
```

消费者禁止引用内部路径：

```ts
// ❌ 禁止
import { createDialogMachine } from '@agile-plus/primitives/src/dialog/machine';

// ✅ 推荐
import { createDialogMachine } from '@agile-plus/primitives';
// 或按需引入
import { createDialogMachine } from '@agile-plus/primitives/dialog';
```

---

## 4. 核心设计原则

### 4.1 Core 与 Framework Adapter 分离

Primitives 层必须保持框架无关。判断标准：

- 文件中是否出现了 `ref()`、`reactive()`、`watch()`、`onMounted()`、`onUnmounted()`？→ 属于 Headless 层。
- 文件中是否出现了 `document.querySelector()`、`element.addEventListener()`？→ 属于 Headless 层。
- 文件是否自己去查找元素、缓存元素引用或订阅事件？→ 属于 Headless 层。接收调用方传入的元素并就地读或写一次不算，见 2.2.1 的三处触点。

如果某个逻辑既包含纯计算又包含 DOM 操作，必须拆分：纯计算下沉到 Primitives，DOM 操作留在 Headless。这条界线可机械验证——Primitives 的 13 个测试文件里 9 个声明 `// @vitest-environment node`，在完全没有 DOM 的环境下跑通，剩下需要 DOM 的正是那三处所在的模块。

### 4.2 状态机驱动

复杂交互组件（Dialog、Select、Tabs、Accordion、Combobox）的状态管理推荐使用显式状态机，而非散落的布尔标志。

状态机优势：

- 状态转换集中定义，避免非法状态组合。
- 可序列化、可调试、可时间旅行。
- 测试时只需断言 `(currentState, action) → nextState`。
- 与框架解耦，天然适合 Primitives 层。

简单组件（Switch、Checkbox）可不使用状态机，直接用纯函数表达状态转换。

### 4.3 Data Attributes 作为样式钩子

UI 层通过 `data-*` 属性暴露状态，而非 CSS class：

```html
<div data-state="open" data-disabled>...</div>
```

样式层通过属性选择器消费：

```scss
@include b('dialog') {
  &[data-state='open'] {
    opacity: 1;
  }

  &[data-disabled] {
    cursor: not-allowed;
    opacity: 0.5;
  }
}
```

优势：

- 逻辑层与样式层完全解耦，样式替换不改逻辑。
- `data-*` 是 HTML 标准，语义明确。
- 避免 class 命名冲突和 BEM 层级污染。
- 便于 DevTools 调试时直观看到当前状态。

### 4.4 受控与非受控双模式

Headless 层的 Composable 必须同时支持两种模式：

```ts
// 非受控：内部维护状态
const { isOpen } = useDialog({ defaultOpen: false });

// 受控：外部控制状态
const open = ref(false);
const { isOpen } = useDialog({
  open: open.value,
  onOpenChange: (v) => (open.value = v),
});
```

实现模式：

```ts
export function useDialog(options: UseDialogOptions = {}): UseDialogReturn {
  const isControlled = options.open !== undefined;

  const internalOpen = ref(options.defaultOpen ?? false);

  const isOpen = computed(() =>
    isControlled ? options.open! : internalOpen.value
  );

  function setOpen(value: boolean): void {
    if (!isControlled) {
      internalOpen.value = value;
    }

    options.onOpenChange?.(value);
  }

  // ...
}
```

### 4.5 复合组件模式

UI 层推荐复合组件（Compound Components）API，而非单一巨型组件：

```vue
<!-- 推荐 -->
<Dialog>
  <DialogTrigger>打开</DialogTrigger>
  <DialogContent>
    <DialogClose>关闭</DialogClose>
    <p>内容</p>
  </DialogContent>
</Dialog>

<!-- 不推荐 -->
<Dialog
  trigger-text="打开"
  close-text="关闭"
  content="内容"
/>
```

优势：

- 消费者自由组合结构和顺序。
- 每个子组件职责单一，易于测试和维护。
- 通过 provide/inject 共享上下文，避免 prop drilling。
- 与 WAI-ARIA 的 role 结构自然对齐。

### 4.6 无障碍内置

无障碍不是事后补丁，而是每层的核心职责：

| 层 | 无障碍职责 |
|---|---|
| Primitives | 键盘映射常量、焦点顺序算法、ARIA 状态值计算 |
| Headless | 焦点陷阱生命周期、屏幕阅读器公告、实时区域管理 |
| UI | `role`、`aria-*`、`tabindex`、键盘事件绑定、`<label>` 关联 |
| Components | Focus Ring 视觉、高对比度适配、Reduced Motion、触摸目标尺寸 |

每个组件必须对照 WAI-ARIA Authoring Practices 验证键盘交互和 ARIA 属性完整性。

---

## 5. 组件清单与优先级

### 5.1 第一批（垂直打通验证）

| 组件 | 复杂度 | 验证价值 |
|---|---|---|
| Dialog | 高 | 覆盖状态机、Focus Trap、Teleport、Overlay、Escape、受控/非受控 |
| Switch | 低 | 验证简单组件是否需要状态机、最小 API 手感 |

### 5.2 第二批（横向扩展）

| 组件 | 关键能力 |
|---|---|
| Select | 列表导航、Typeahead、虚拟滚动接口、多选 |
| Tabs | 箭头键导航、激活策略（自动/手动）、方向（水平/垂直） |
| Popover | Floating 定位集成、点击外部关闭、锚点更新 |
| Dropdown Menu | 嵌套菜单、子菜单延迟、角色分组 |
| Tooltip | 延迟显示/隐藏、hover/focus 双触发、位置自适应 |

### 5.3 第三批（完善生态）

| 组件 | 关键能力 |
|---|---|
| Accordion | 单选/多选、展开动画、动态高度 |
| Checkbox / Radio Group | 表单集成、indeterminate、键盘导航 |
| Combobox / Autocomplete | 异步搜索、高亮匹配、自定义渲染 |
| Toast / Notification | 队列管理、自动关闭、暂停计时 |
| Scroll Area | 自定义滚动条、虚拟滚动接口 |
| Avatar | 图片加载回退、文字缩写生成 |

---

## 6. 开发流程与质量门禁

### 6.1 新组件开发检查清单

开发每个组件时，按以下顺序验证：

- [ ] Primitives 层：纯单元测试通过，无框架依赖，类型完整，JSDoc 齐全。
- [ ] Headless 层：Composable 单元测试通过，受控/非受控双模式验证，资源清理验证。
- [ ] UI 层：WAI-ARIA 属性完整，键盘交互符合规范，零样式验证，插槽 props 类型安全。
- [ ] Components 层：样式遵循 BEM + CSS Variables，交互状态复用 mixin，reduced-motion 处理，主题切换验证。
- [ ] 跨层集成：E2E 或组件测试覆盖核心交互路径。
- [ ] 文档：API 表格、使用示例、无障碍说明、已知限制。

### 6.2 变更影响评估

修改任何公共 API 前必须回答：

1. 这是否是 Breaking Change？如果是，是否需要主版本升级或迁移指南？
2. 受影响的是哪一层？下游哪些包/应用会感知到这个变化？
3. 是否可以通过扩展而非修改来实现？
4. 是否有真实消费者在用这个 API？还是只是假设有人在用？

### 6.3 禁止行为

- 禁止在 Primitives 中引入 Vue/React，禁止该层自行查找元素、注册监听或缓存 DOM 引用（2.2.1 表中的三处传入型触点除外）。
- 禁止在 Headless 中重新实现 Primitives 已有的算法。
- 禁止在 UI 层添加任何视觉样式（颜色、尺寸、阴影、圆角、字体）。
- 禁止在 Components 层直接引用 Primitives 内部路径。
- 禁止为了减少代码量创建难以理解的元编程或过度泛型。
- 禁止用 `any`、`@ts-ignore`、`as unknown as` 绕过类型检查。
- 禁止删除 focus outline 而不提供替代方案。
- 禁止用 JavaScript 完成 CSS 可以处理的视觉状态。

---

## 7. 演进策略

### 7.1 渐进式落地

不要一次性建完四层所有组件。推荐路径：

```text
Phase 1: Dialog 垂直打通四层 → 验证分层边界和 API 手感
Phase 2: Switch 垂直打通 → 验证简单组件的最小实现
Phase 3: 抽取共性到 primitives/shared → 验证抽象时机
Phase 4: Select + Tabs 横向扩展 → 验证列表导航和 Floating 集成
Phase 5: 批量扩展剩余组件 → 已有模式成熟，加速产出
```

### 7.2 抽象时机判断

只有满足以下条件时才从具体组件中抽取公共能力到 `shared` 或更高层：

1. 至少两个组件已经独立实现了相同逻辑。
2. 抽取后明显更容易理解和维护。
3. 删除该抽象会让实现明显变差。

不为假设的未来需求提前抽象。三次重复再抽象。

### 7.3 迁移现有组件

对于项目中已有的组件，采用绞杀者模式渐进迁移：

1. 为新组件直接使用四层架构。
2. 为旧组件增加 UI 层包装，内部仍用旧实现。
3. 逐步将旧实现替换为 Headless + Primitives。
4. 验证通过后移除旧代码。

不做大爆炸式重写。

---

## 8. 参考资源

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Radix UI Primitives 源码](https://github.com/radix-ui/primitives)
- [VueUse Composables 源码](https://github.com/vueuse/vueuse)
- [Zag.js 状态机驱动组件](https://zagjs.com/)
- 项目内部规范：`references/architecture.md`、`references/vue.md`、`references/typescript.md`、`references/styles.md`
