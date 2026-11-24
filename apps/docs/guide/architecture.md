# 分层架构

本组件库参照 Radix UI / Reka UI 的分层哲学，适配 Vue 3 + TypeScript + pnpm Monorepo。

核心目标是让**逻辑、交互结构与视觉表现彼此独立演进**：换一套主题不需要改动任何行为代码，重写交互算法不影响已有样式。

## 四层模型

<div class="layer-card"><strong>@agile-plus/primitives — 框架无关内核</strong>状态机、纯计算、稳定协议。不含 <code>ref</code>、<code>onMounted</code>，也不自行查找元素或注册监听；13 个测试文件里 9 个在纯 node 环境下跑通。</div>

<div class="layer-card"><strong>@agile-plus/headless — Vue 适配层</strong><code>useXxx</code> Composables，负责响应式桥接、生命周期与资源清理、DOM 事件绑定。</div>

<div class="layer-card"><strong>@agile-plus/ui — 无样式组件</strong><code>role</code> / <code>aria-*</code> / <code>data-*</code> / 键盘交互 / 插槽契约。零 class、零颜色、零尺寸。</div>

<div class="layer-card"><strong>@agile-plus/components — 带样式组件</strong>BEM 命名空间 + 组件级 CSS Variables + Design Token，主题化与交互动画。</div>

依赖方向严格单向：

```text
components → ui → headless → primitives
```

禁止反向依赖、跨层引用内部路径、循环依赖。

## 每层解决的真实问题

| 层级       | 解决的问题                    | 若不拆分会怎样                            |
| ---------- | ----------------------------- | ----------------------------------------- |
| primitives | 状态转换需要可测试、可推理    | 算法埋在组件里，测试必须 mount 整个组件树 |
| headless   | Vue 响应式与 DOM 生命周期绑定 | 每个组件重复实现 ref 桥接与监听清理       |
| ui         | WAI-ARIA 结构与键盘交互       | 无障碍属性散落在业务组件中，难以保证一致  |
| components | 视觉主题与 Design Token       | 换主题需要修改行为代码                    |

判断新代码属于哪一层的三个问题：

1. 文件是否出现 `ref()` / `watch()` / `onMounted()`？→ Headless 层。
2. 文件是否**主动**去找 DOM（`querySelector`、`addEventListener`、`getBoundingClientRect`、自己记下元素引用）？→ Headless 层。
3. 文件是否只处理调用方交进来的参数？→ Primitives 层。接收一个元素参数并就地 `focus()` 或读一次文本不算越界，这层有且只有三处这样的触点：`dom/tabbable`、`form/hidden-input`、`toast/announce`。

## 公共能力登记表

同一件 DOM 小事在第二个组件里出现时就抽成公共模块，只有一处用到则留在组件里。抽出去后必须在这里登记；写新组件先查这张表，别自己再实现一份尺寸跟随或焦点陷阱。

| 能力              | 位置                                                                                | 关键约束                                                                                                                       | 使用方                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 受控 / 非受控状态 | headless `utils/useControllable`                                                    | `undefined` 才是未受控；先写内部值再通知外部；生命周期里的静默修正走 `replace`                                                 | Checkbox、CheckboxGroup、RadioGroup、Slider、Splitter 面板、Switch、Toast、Toggle、ToggleGroup。Dialog 与 Tabs 以状态机为真源（见「受控与非受控」），测量类 composable 没有值状态 |
| 退出动画挂载      | primitives `presence` + headless `usePresence`                                      | 进出场必须写成 `@keyframes`；用 `transition` 会被判成「没有动画」而当帧卸载                                                    | Dialog 遮罩与内容、Toast、Select、Popover、Tooltip、DropdownMenu 内容                                                                                                             |
| 打开过之后常驻    | headless `useKeepMounted`                                                           | 只认浮层开合这一个真源：打开之前不渲染，打开过之后不销毁；看不见与否必须由样式层的 closed 状态自己兜住                         | DropdownMenu 内容（成品层默认开）                                                                                                                                                 |
| 隐藏表单 input    | primitives `form/hidden-input` + headless `useBubbleInput`                          | input 是控件的兄弟节点；`checked` 走原型 setter 并派发冒泡 `change`；`defaultChecked` 只在挂载时写一次，并监听 `form` 的 reset | Checkbox、Switch                                                                                                                                                                  |
| 元素尺寸跟随      | headless `utils/useResizeObserver`                                                  | 没有 `ResizeObserver` 的环境退化成「元素变化时测一次」，不抛错                                                                 | useBubbleInput、Slider、ScrollArea、Select、Splitter 根                                                                                                                           |
| 可聚焦元素收集    | primitives `dom/tabbable`                                                           | 跳过 `disabled`、`hidden`、`aria-hidden`、`type=hidden`；`focusFirst` 逐个尝试直到焦点真的落到某个上                           | Dialog 焦点陷阱、Toast 视口、ToggleGroup 罗盘焦点                                                                                                                                 |
| 指针拖拽          | headless `utils/usePointerDrag`                                                     | 同一实例再次 `start` 先按 `cancel` 结束上一段；`onEnd(reason)` 区分抬起与取消，因此自己的会话要在 `start` 之后登记             | Slider、ScrollArea、Splitter 分隔条                                                                                                                                               |
| 有序注册表        | headless `utils/useCollection`                                                      | 内部用 `shallowRef`，否则嵌套 Ref 被 `ref()` 解包                                                                              | Toast、RadioGroup、ToggleGroup、Select、Splitter 面板                                                                                                                             |
| 菜单导航计算      | primitives `menu` + headless `useMenu`                                              | primitives 负责选中/展开转移与键盘纯计算；`useMenu` 负责 Vue 状态、注册与焦点                                                  | 使用方 `Menu`                                                                                                                                                                     |
| 环境能力判定      | headless `utils/env`                                                                | `isBrowser` 与 `isObserverAvailable` 分开判断：SSR 和「浏览器但缺 API」是两种降级                                              | 各 DOM 相关 composable                                                                                                                                                            |
| 滚动锁与焦点陷阱  | headless `utils/useScrollLock`、`utils/useFocusTrap`                                | 滚动锁按引用计数释放；陷阱用栈，只有栈顶响应键盘与 focusin                                                                     | Dialog                                                                                                                                                                            |
| 元素替换与引用    | ui `Slot` 的 `asChild` / `elRef`                                                    | 元素引用必须经 `h()` / `cloneVNode` 传，`vnode.ref` 在 Vue 3.5 已归一化成对象，直接赋值会失效                                  | 所有支持 `asChild` 的部件                                                                                                                                                         |
| 表单 reset 监听   | headless `utils/useFormResetListener`                                               | 归属按「显式 id → 原生 form 属性 → 就近包含」解析；控件或 id 变化时监听随之迁移                                                | useBubbleInput、useFormControl、useSelect                                                                                                                                         |
| 约束校验快照      | primitives `form/validity`                                                          | 校验真源是浏览器 `ValidityState`，组件只摊平快照；内置错误优先于自定义规则，结果经 `setCustomValidity` 落回原生                | Form 全家族                                                                                                                                                                       |
| 传送目标          | headless `useDialog.portalTarget`                                                   | 遮罩与内容共用同一个目标，否则两层的 z-index 关系不再由组件保证                                                                | Dialog                                                                                                                                                                            |
| 可用空间测量      | headless `useFloating.availableSpace` + primitives `floating/computeAvailableSpace` | 与坐标出自同一次测量；限制浮层最大高度时读它，不自建第二套 scroll/resize 监听                                                  | Select                                                                                                                                                                            |
| 隐藏原生 select   | primitives `form/getHiddenSelectStyle` `writeNativeSelectValue`                     | 与 BubbleInput 同源，但定位用 top/left 归零：flex 外壳下 `translateX(-100%)` 会跑出容器；值走原型 setter 并派发冒泡 change     | Select                                                                                                                                                                            |

还没抽出来的两处，以及为什么：

- **Portal 已有 Dialog、Tooltip、Select 三个消费者**（Toast 传送到视口元素，性质不同），但三者各自只拿一个 `container` / `portalTarget`，缺省都是 body，没有共享的目标解析规则。抽公共 `usePortalTarget` 的触发条件已到，仍留作独立一轮：现在抽要同时改三个稳定组件的公开入参，换不来行为收益。
- **罗盘焦点就地写在 ToggleGroup**。它是第一个用到 `dom/tabbable` 的罗盘实现，等到第二个（如 Menubar）再抽象 `useRovingFocus`，避免为一个场景猜扩展点。

已知的一处历史分叉：RadioGroup 的隐藏 input 仍由组级 composable 出属性表、`checked` 走 attribute、input 嵌在 `<button>` 内。迁到 `useBubbleInput` 需要先把「每个选项的元素引用」接进组级 API，记在 radio-group 文档的对应章节，未在本轮处理。

## 关键契约

### data-\* 是层间接口

逻辑层不输出 class，只输出状态数据：

```html
<div data-state="open" data-part="content" data-disabled></div>
```

样式层通过属性选择器消费：

```scss
.y-dialog[data-part='content'][data-state='open'] {
  opacity: 1;
}
```

这样样式可以整套替换而逻辑无需改动。

**连续数值不能靠 `data-*` 表达**：属性选择器只能枚举有限取值，而进度、位置这类值是连续的。这时开第二个层间接口——由无头层在**根节点**声明一个无单位的自定义属性，换算规则留在样式层（Progress 的 `--y-progress-value` + 样式层的 `calc(var(--y-progress-value) * 100%)`）。两个约束：自定义属性只向下继承，所以变量必须写在共同的祖先上；无头层不要直接内联 `width`，否则样式层就失去了换成 `transform` 或加内缩边距的自由。

### 受控与非受控

受控判定由共享的 `useControllable` 承担（`packages/headless/src/utils/useControllable.ts`，对应 Radix 的 `useControllableState`）。新增带状态的 Composable 时用它的泛型形态，不要再手写「controlled computed + isControlled computed + internal ref + value computed」这套四行样板：

```ts
const state = useControllable<boolean>({
  value: () => toValue(options.checked),
  defaultValue: options.defaultChecked ?? false,
  onChange: (next) => options.onCheckedChange?.(next),
});

const checked = state.value; // 受控时跟随外部，否则是内部状态
```

三条约定：

1. **`undefined` 是「未受控」的唯一判据**。所以 `defaultValue` 必须由调用方显式给出，hook 不猜零值；封装层的 Boolean prop 缺省也必须留 `undefined`（见下一节）。
2. **写入顺序固定为「先落地内部状态，再通知外部」**。回调里同步读 `value` 得到的是新值；受控模式下不写内部，只通知——写内部就是越权改写调用方的状态。
3. `replace(next)` 只修内部值且不通知，留给「卸载子项时清掉选中值」这类生命周期兜底；用户操作一律用 `set`。

`useDialog` 与 `useTabs` 是例外：它们的状态真源在 primitives 的状态机里，`internal` 只是机器的镜像，再套一层 `useControllable` 只会多一次同步。这两处保持现状。

Composable 的受控参数类型为 `MaybeRefOrGetter`，因为裸值在传入瞬间就被固化。封装成组件时，组件 prop 仍应是纯值类型，由组件内部用 `toRef(() => props.open)` 交给 Composable：

```ts
// 组件 prop 必须是纯 boolean：把 MaybeRefOrGetter 直接当 prop 类型，
// Vue 会把传入的 Ref 当成值本身，受控状态无法回流。
const props = withDefaults(defineProps<DialogRootProps>(), { closeOnEscape: true });

const dialog = useDialog({
  ...props,
  open: toRef(() => props.open),
  onOpenChange: (value) => emit('update:open', value),
});
```

### Boolean prop 的默认值会在透传时丢失

Vue 对 `Boolean` 类型的 prop 会把「未传入」转换为 `false`，而不是 `undefined`。这会造成两类完全不同的故障，都必须显式处理。

**第一类：默认值被透传覆盖。** 上层组件用 `v-bind="$props"` 向下透传时，`false` 会被当作显式传入的值，覆盖下层组件自己的 `true` 默认值：

```ts
// ❌ 缺少 withDefaults：closeOnEscape 变成 false 并透传，Escape 静默失效
defineProps<DialogRootProps>();

// ✅ 每一层都显式声明默认值
withDefaults(defineProps<DialogRootProps>(), {
  closeOnEscape: true,
  closeOnOverlayClick: true,
});
```

**第二类：受控判定被击穿。** 本库的 Composable 用「受控属性是否为 `undefined`」区分受控与非受控，而 Boolean prop 缺失时拿到的是 `false`，组件因此被误判成「受控且值恒为 false」——表现为**非受控用法整体失效**：只写 `defaultOpen` 的 Dialog 永远打不开，不绑 `v-model:checked` 的 Checkbox 永远点不动。构建、类型检查与 lint 全都发现不了，只有真的点一下才暴露。

```ts
// ❌ 类型写法：boolean | 'indeterminate' 被推断为 Boolean prop，缺失时是 false 而非 undefined
const props = withDefaults(defineProps<CheckboxRootProps>(), { defaultChecked: false });

// ✅ 运行时声明并显式 default: undefined，保留「未提供」这一状态
const props = defineProps({
  checked: { type: [Boolean, String] as PropType<CheckboxCheckedState>, default: undefined },
  defaultChecked: { type: [Boolean, String] as PropType<CheckboxCheckedState>, default: false },
});
```

三态类型同样会被推断成 Boolean prop，因此带三态的受控属性必须走运行时声明。只有字符串类型的受控属性（`modelValue?: string`）不受影响。

带样式的封装层与无样式的根组件层都必须按这两条检查，这是这类透传结构的固定要求；每提供一个受控布尔属性，就要配一个「不绑定 v-model 也能正常工作」的示例，否则这条故障只能靠手点发现。

### 自定义属性的值不会被 Sass 求值

`--x: getCssVar('radio', 'border')` 这种写法会把 `getCssVar(...)` 当成普通文本原样输出，产出一个非法的自定义属性值；引用它的 `border: 1px solid var(--x)` 随之整条失效，而且元素的其它声明看起来正常，问题很难定位。

```scss
// ❌ 函数调用出现在自定义属性的值位置，Sass 不求值
--y-radio-state-border: getCssVar('radio', 'border');

// ✅ 直接写 var() 引用
--y-radio-state-border: var(--y-radio-border);

// ✅ 或在 set-component-css-var 内部（该 mixin 已用 #{} 插值）
@include set-component-css-var(
  'radio',
  (
    'border': var(--y-color-border),
  )
);
```

普通属性（`color:`、`gap:`）的值位置不受此限制，`getCssVar()` 照常求值，因此这个坑只在「用自定义属性表达状态」时才会遇到。

### 自定义属性只向下继承

组件级变量声明在 `set-component-css-var` 所在的选择器上，只有它**自身和后代**读得到。当一个组件由「父容器 + portal 进来的子元素」组成时，父容器读子元素的变量会得到未定义值，整条声明按 invalid at computed-value time 处理——属性被丢弃，而不是回退到初始值，所以表现是「定位没生效」这类难查的视觉错误。

```scss
// ❌ 视口是卡片的父级，读不到只声明在 .y-toast 上的变量
@include b('toast-viewport') {
  top: getCssVar('toast', 'offset'); // → var(--y-toast-offset) 未定义，top 失效
}

// ✅ 把变量表同时声明在两个 Block 上，让每个 Block 独立可用
$toast-vars: (
  'offset': var(--y-padding-md),
  ...,
);

@include b('toast') {
  @include set-component-css-var('toast', $toast-vars);
}

@include b('toast-viewport') {
  @include set-component-css-var('toast', $toast-vars);
}
```

子元素读父级变量（`.y-radio` 读 `--y-radio-group-gap`）是安全的，方向反过来才出问题。写样式前先确认：读变量的选择器，是不是声明变量的选择器的后代。

### 事件用 v-on，属性用 v-bind

`get*Props()` 只返回可绑定的 ARIA 属性，事件处理器作为独立函数返回：

```vue
<button v-bind="getTriggerProps()" @click="open()">打开</button>
<div v-bind="getContentProps()" @keydown="onContentKeydown">…</div>
```

把 `onClick` 混入 `v-bind` 对象会让模板中事件的来源不可见，消费者想叠加自己的处理逻辑时无从下手。

### 注册与导航顺序

Tabs 的键盘导航顺序来自 tab 注册顺序，因此注册必须发生在子组件 `setup` 阶段而不是属性求值函数中——后者会让 `computed` 产生副作用并触发递归更新。

## 目录约定

```text
packages/
├─ primitives/src/<component>/{types,machine,keyboard,index}.ts
├─ headless/src/use<Component>/{types,use<Component>,index}.ts
├─ ui/src/<Component>/<Component><Part>.vue
└─ components/src/<Component>/{<Component>.vue,<Component>.scss,index.ts}
```

每个包通过 `src/index.ts` 统一导出，并支持子路径按需引入（`@agile-plus/primitives/dialog`）。

## 相关文档

- [快速开始](/guide/getting-started)
- [Dialog 组件](/components/dialog)
- [Tabs 组件](/components/tabs)
