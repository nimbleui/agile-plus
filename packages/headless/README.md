# @agile-plus/headless

Vue Composables 适配层：把 `@agile-plus/primitives` 的纯计算桥接成响应式状态与 DOM 绑定。

本包不渲染任何东西，只返回「状态 + props 生成函数 + 元素 ref」。模板你自己写，因此结构、类名、
外观完全由你决定；受控/非受控切换、表单集成、焦点陷阱、拖动测量由本包保证。

```text
@agile-plus/components   带样式成品组件
@agile-plus/ui           无样式组件（本包 + primitives 的模板化封装）
@agile-plus/headless     ← 本包
@agile-plus/primitives   框架无关内核
```

依赖 `@agile-plus/primitives`，peer 依赖 `vue ^3.5.0`。

## 安装

```bash
pnpm add @agile-plus/headless
```

## 入口

根入口导出全部 composable；36 个子路径按控件切分，便于只打包用到的控件：

```ts
import { useSwitch } from '@agile-plus/headless';
import { useSwitch } from '@agile-plus/headless/useSwitch';
```

`./useDialog` `./useTabs` `./useRadioGroup` `./useCheckbox` `./useCheckboxGroup`
`./useForm` `./useFormField` `./useFormControl` `./useFormMessage` `./useCollapsible`
`./useScrollArea` `./usePresence` `./useKeepMounted` `./useToastProvider` `./useToastViewport`
`./useToast` `./useToggle` `./useToggleGroup` `./useSwitch` `./useSlider` `./useFloating`
`./useTooltip` `./usePopover` `./useDropdownMenu` `./useSelect` `./useDatePicker` `./useDateRangePicker` `./useEllipsis` `./useInput` `./useTextarea` `./usePagination` `./useTable` `./useAccordion` `./useAvatar` `./useSplitter`

`./useAvatar` 一个子路径导出三个配套 composable：`useAvatar`（根，持有加载状态）、
`useAvatarImage`（图片加载生命周期）、`useAvatarFallback`（补位延迟）。

## 统一形态

每个 `useXxx(options)` 返回的都是同一类四件套：

| 组成             | 例                                                                               | 用法                   |
| ---------------- | -------------------------------------------------------------------------------- | ---------------------- |
| 响应式状态       | `checked` `isOpen` `values` `activeValue`                                        | 模板里读               |
| 变更方法         | `setChecked` `open` `close` `toggle` `setActive`                                 | 你自己写交互时调       |
| props 生成函数   | `getRootProps()` `getThumbProps()` `getInputProps()`                             | `v-bind` 到对应元素    |
| 元素入口与处理器 | `setControl` `setInputElement` `onRootClick` `onThumbKeydown` `onContentKeydown` | `:ref` / `@click` 绑定 |

props 生成函数返回的是普通对象（含 `role` / `aria-*` / `data-*`），所以可以直接 `v-bind`，
也可以先合并自己的属性再绑。

## 受控与非受控

唯一实现是内部工具 `useControllable`：判据为「受控入参当前值不为 `undefined`」。

```ts
const state = useControllable<boolean>({
  value: () => toValue(options.checked), // 传了 → 受控
  defaultValue: options.defaultChecked ?? false,
  onChange: (v) => options.onCheckedChange?.(v),
});
```

- `set(v)`：受控时不写内部值，但两种模式都会触发 `onChange`，由外层写回。
- `replace(v)`：只改内部值且不通知，用于「外层被卸载时清掉选中态」这类不应冒泡的变更。

由此有两条对使用方的硬要求，也是这一层最容易写错的地方：

1. 布尔受控入参（`checked` / `open` / `pressed`）缺省必须是 `undefined`，不能默认 `false`。
   一旦默认成 `false`，「用户没传」与「用户显式传 false」就分不开，非受控模式会被永久锁死。
2. 受控入参支持 `boolean` / `Ref<boolean>` / getter 三种写法（类型为 `MaybeRefOrGetter`），
   内部统一 `toValue()` 读取。Vue 模板自动解包 Ref，所以模板里写 `:checked="x"` 即可。

## 入参命名与不对称之处

入参名沿用被桥接控件的语义，因此不统一；下表是按源码逐个抄的，选用时以 `types.ts` 为准：

| composable                                                                                            | 受控入参     | 缺省值            | 回调                                           |
| ----------------------------------------------------------------------------------------------------- | ------------ | ----------------- | ---------------------------------------------- |
| `useDialog` `useCollapsible` `useToast` `useTooltip` `useSelect` `useDatePicker` `useDateRangePicker` | `open`       | `defaultOpen`     | `onOpenChange`                                 |
| `useCheckbox` `useSwitch`                                                                             | `checked`    | `defaultChecked`  | `onCheckedChange`                              |
| `useToggle`                                                                                           | `pressed`    | `defaultPressed`  | `onPressedChange`                              |
| `useEllipsis`                                                                                         | `expanded`   | `defaultExpanded` | `onExpandedChange`                             |
| `useTabs` `useRadioGroup` `useCheckboxGroup` `useSelect` `useDatePicker` `useDateRangePicker`         | `modelValue` | `defaultValue`    | `onValueChange`                                |
| `useToggleGroup` `useSlider` `useAccordion`                                                         | `value`      | `defaultValue`    | `onValueChange`（Slider 另有 `onValueCommit`） |
| `useInput` `useTextarea`                                                                              | `modelValue` | `defaultValue`    | `onModelValueChange`                           |
| `useSplitterPanel`                                                                                    | `size`       | `defaultSize`     | `onSizeChange`（像素与 `'30%'` 两种单位原样回写） |

另两处不对称也照实说：`useCollapsible` 的 props 生成函数叫 `getRootAttrs` / `getTriggerAttrs` /
`getContentAttrs`（其余控件都是 `get*Props`）；元素入口的命名也不统一，按源码逐个抄为：
`setElement` / `setContentElement` / `setControl` / `setInputElement` / `setControlElement` /
`setRootElement` / `setThumbElement` / `setViewport`（各自的 `setXxx`），`bindElement`（Toast）与
`bindWrapper` / `bindList` / `bindHeadProxy` / `bindTailProxy`（ToastViewport），以及直接暴露可写
ref 的 `viewportRef`（ScrollArea）。

`usePresence` 的 `present` 与 `useToggleGroup` 的 `type`（`'single' | 'multiple'`）在类型上就是必填，
缺参数直接编译不过。`useToast` 与 `useToastViewport` 的 `provider` 同样必填。

## 表单

表单三件套**不使用 `provide` / `inject`**：`useFormField`、`useFormControl`、`useFormMessage`
通过位置参数显式接收 `useForm` 的返回值。代价是调用方要自己传，收益是三个 composable 脱离
父子链也能单测，且谁依赖谁在签名上一目了然。

```ts
const form = useForm({ onClearServerErrors });
const field = useFormField({ name: 'email', serverInvalid }, form);
const control = useFormControl({ name: 'email' }, form, field);
const message = useFormMessage({ match: 'valueMissing' }, form, field);
```

- `useForm` 内部是四张以字段 `name` 为键的注册表（validity、customErrors、messageIds 三张 `ref`
  表，加一张 `Map` 存校验器），全部方法按字段查询。
- `useFormControl.validate()` 异步：先跑原生约束，再跑命中的自定义校验器；同步校验器抛错按失败处理，
  异步被 reject 同样按失败处理，不静默。
- 原生校验只在值真的变化时重跑；`reset()` 不派发 `input` 事件，所以额外挂 `form` 的 `reset`
  监听来复原，而程序化赋值走原型 setter，不会被这套监听误判成用户输入。

## 原生表单能力

Checkbox 与 Switch 用内部工具 `useBubbleInput` 生成隐藏原生 input：`<button>` 内不允许再放交互元素，
所以 input 作为按钮的兄弟节点、按按钮实测尺寸覆盖在其上。这样提交值、`required` 校验、
`form` 的 `change` 事件都仍然成立，而指针事件照旧落在按钮上。
与 Radix 的有意差异是这里直接派发原生 `change`（一次变化一次事件），不靠冒泡 `click` 推导，
因此不需要「用户点击 / 程序化更新」两套记账。

## 示例：只有一只开关

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useSwitch } from '@agile-plus/headless/useSwitch';

const checked = ref(false);
const sw = useSwitch({ checked, onCheckedChange: (v) => (checked.value = v) });
</script>

<template>
  <span v-bind="sw.getRootProps()" class="my-switch">
    <span v-bind="sw.getThumbProps()" />
  </span>
  <input v-if="sw.isFormControl" v-bind="sw.getInputProps()" :ref="sw.setInputElement" />
</template>
```

## 内部工具（不导出）

`src/utils/` 下的 `useControllable`、`useCollection`、`useBubbleInput`、`useFocusTrap`、
`usePointerDrag`、`useResizeObserver`、`useScrollLock`、`useFormResetListener`、`env` 是这一层的
共享零件，不在公共 API 内，签名可能随版本变动，不要依赖。

## 版本与许可

许可 MIT。`sideEffects: false`。发布产物含 `dist` 与 `src`，`src` 供源码级排查对照，
不构成公共 API。`__tests__` 下 20 个测试文件。
