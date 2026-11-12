# @agile-plus/primitives

框架无关的无头组件原语层：状态机、纯计算、稳定协议。

这里是四层模型的最底层，不导入 Vue / React，不订阅生命周期，只把「一个控件应该处于什么状态、
应该输出哪些 ARIA 与 `data-*` 属性」算成纯函数结果。上层拿这些结果去绑定响应式与 DOM。

```text
@agile-plus/components   带样式成品组件
@agile-plus/ui           无样式组件（WAI-ARIA、键盘交互、Slots 契约）
@agile-plus/headless     Vue Composables（响应式桥接、生命周期、DOM 绑定）
@agile-plus/primitives   ← 本包
```

依赖方向严格单向，本包不依赖本库任何其他包，也没有 `vue` peer 依赖。

## 安装

```bash
pnpm add @agile-plus/primitives
```

## 入口

根入口一次性引入全部原语；15 个子路径各自独立，按需引入便于 tree-shaking：

```ts
import { getSwitchAttrs } from '@agile-plus/primitives';
import { getSwitchAttrs } from '@agile-plus/primitives/switch';
```

`dialog` `flex` `tabs` `radio-group` `checkbox` `scroll-area` `toast` `presence` `toggle`
`switch` `slider` `dom` `form` `collapsible` `progress`

## 三类 API

这层只有三种形状，看清这一点就能预测任何新控件的 API：

| 形状 | 例子 | 为什么这样分 |
| --- | --- | --- |
| 状态机 | `createDialogMachine` `createTabsMachine` | 有迁移、有订阅、需要一份跨组件共享的单一状态源 |
| 属性映射 | `getSwitchAttrs` `getCheckboxAttrs` `getCollapsibleRootAttrs` | 状态已知，只剩「该输出哪些属性」的纯查表 |
| 几何/规则计算 | `getThumbMetrics` `snapSliderValue` `getSliderNextValues` | 只有算式，没有状态，也不产出属性 |

## 模块清单

| 模块 | 主要导出 |
| --- | --- |
| `dialog` | `createDialogMachine` `handleDialogKeydown` |
| `tabs` | `createTabsMachine` `handleTabsKeydown` |
| `radio-group` | `handleRadioGroupKeydown`（值本身由调用方持有，这层只提供 roving focus 的按键规则） |
| `checkbox` | `getCheckboxAttrs` `resolveNextChecked` `resolveIndeterminate` `toggleGroupValue` `isGroupValueChecked` `isCheckboxIndicatorPresent` |
| `switch` | `getSwitchAttrs` `getSwitchDataState` |
| `toggle` | `getToggleDataState` `resolveNextTogglePressed` `resolveGroupValueAfterToggle` `normalizeToggleGroupValue` `serializeToggleGroupValue` `resolveRovingFocusIntent` `resolveRovingFocusTargetIndex` `resolveDirectionAwareKey` `ROVING_FOCUS_KEY_MAP` |
| `collapsible` | `getCollapsibleState` `getCollapsibleRootAttrs` `getCollapsibleTriggerAttrs` `getCollapsibleContentAttrs` `getCollapsibleContentVars` `COLLAPSIBLE_HEIGHT_VAR` `COLLAPSIBLE_WIDTH_VAR` |
| `progress` | `getProgressRootAttrs` `getProgressIndicatorAttrs` `getProgressDataAttrs` `getProgressRatio` `getProgressState` `getProgressVars` `resolveProgressMax` `toProgressNumber` `defaultGetValueLabel` `PROGRESS_VALUE_VAR` `PROGRESS_DEFAULT_MAX` |
| `slider` | `clampSliderValue` `snapSliderValue` `getSliderNextValues` `getSliderNextStepValue` `getSliderValueFromPointer` `getSliderValuePercent` `getSliderVisualPercent` `getSliderKeyboardIntent` `getSliderRangeStyle` `getSliderThumbInBoundsOffset` `getSliderThumbLabel` `getSliderClosestValueIndex` `normalizeSliderValues` |
| `scroll-area` | `getThumbMetrics` `clampThumbOffset` `getScrollOffsetFromThumb` `resolveScrollbarVisibility` `DEFAULT_MIN_THUMB_SIZE` |
| `toast` | `createToastTimerSnapshot` `pauseToastTimer` `resumeToastTimer` `isToastTimerDisabled` `resolveSwipeMove` `getSwipeEndPhase` `isDeltaInDirection` `clampSwipeDelta` `getToastAnnounceTextContent` `isToastHotkeyPressed` `formatToastHotkey` `resolveToastViewportLabel` `VISUALLY_HIDDEN_STYLE` `TOAST_*` 常量 |
| `presence` | `sendPresenceEvent` `isPresencePresent`（`mounted` / `unmountSuspended` / `unmounted` 三态迁移） |
| `form` | `getHiddenInputAttrs` `getHiddenInputStyle` `writeNativeChecked` `readValiditySnapshot` `hasBuiltInError` `getFieldStateAttrs` `concatAriaDescribedby` `getFirstInvalidControl` `getMessageMatch` `isSyncCustomMatcher` `isAsyncCustomMatcher` `VALIDITY_MATCHERS` `VALIDITY_FLAGS` `BUILT_IN_VALIDITY_MESSAGES` |
| `flex` | `getFlexAttrs` `getFlexStyles` `getFlexItemAttrs` `getFlexItemStyles` `isFlexGapScale` `FLEX_GAP_SCALES` |
| `dom` | `getTabbableCandidates` `focusFirst` |

## 状态机

只有 Dialog 与 Tabs 需要状态机：它们的状态被多个部件共享，且需要订阅。

```ts
import { createDialogMachine } from '@agile-plus/primitives/dialog';

const machine = createDialogMachine({ closeOnEscape: true, closeOnOverlayClick: true });
const unsub = machine.subscribe((state) => console.log(state.open));

machine.send({ type: 'OPEN' }); // 也可 { type: 'CLOSE' } | { type: 'TOGGLE' } | { type: 'SET_OPEN', payload }
machine.getState(); // { open, triggerId, contentId, titleId, descriptionId }
machine.destroy();
```

`DialogState` 里的四个 id 是协议的一部分：上层用它们拼 `aria-labelledby` / `aria-describedby` /
`aria-controls`，这样标题和描述可以写在 DOM 任意位置，不必是内容元素的子节点。
`createTabsMachine` 同构（`SET_ACTIVE` / `NAVIGATE_NEXT` / `REGISTER_TAB` 等迁移），
并额外维护 tab 注册表，因为键盘导航需要知道有几个可聚焦项。

`handleDialogKeydown` / `handleTabsKeydown` / `handleRadioGroupKeydown` 都是纯函数：
输入按键与当前上下文，输出「要不要关闭」「下一个聚焦谁」，不碰 DOM。

## 属性映射约定

未启用的状态不输出属性，这样 CSS 属性选择器 `[data-disabled]` 只命中禁用态，与 Radix 一致：

```ts
import { getSwitchDataState, getSwitchAttrs } from '@agile-plus/primitives/switch';

getSwitchDataState(true); // 'checked'
getSwitchAttrs({ checked: true, disabled: false, required: false });
// { role: 'switch', 'aria-checked': true, 'data-state': 'checked' }
// disabled / required 为 false 时，data-disabled 与 aria-required 直接缺席
```

`data-state` 取值按控件固定，样式层靠它写选择器：

| 控件 | `data-state` |
| --- | --- |
| checkbox | `checked` / `unchecked` / `indeterminate`（`aria-checked` 对应 `true` / `false` / `mixed`） |
| switch | `checked` / `unchecked` |
| toggle | `on` / `off` |
| collapsible / dialog / toast | `open` / `closed` |
| tabs trigger 与 content | `active` / `inactive` |
| progress | `loading` / `complete` / `indeterminate` |
| scroll-area 滚动条与 corner | `visible` / `hidden` |

`data-disabled` 一律是空串（存在即禁用），不写 `="false"`。

## 连续值走 CSS 自定义属性

进度、滑块这类连续值不进属性选择器（属性选择器只能判离散值，还得在每次拖动时重写 DOM）。
这层把它们算成变量写进 `style`：

```ts
import { getProgressRatio, PROGRESS_VALUE_VAR } from '@agile-plus/primitives/progress';

getProgressRatio(40, 100); // 0.4，样式层写进 var(--y-progress-value)
getProgressRatio('NaN' as unknown, 100); // null —— 不确定进度，调用方据此不写数值变量
```

## 约束

- 禁止导入框架 API（`ref` / `reactive` / `watch` / 生命周期）。
- 不主动读写 DOM，但少数函数把元素当参数：`getTabbableCandidates` / `focusFirst` 接收容器元素，
  `writeNativeChecked` 接收 `HTMLInputElement`（走原型 setter 写值），`getToastAnnounceTextContent`
  遍历传入容器的子节点取文本，`getFirstInvalidControl` 接收候选集合。
  `readValiditySnapshot` 拿的是 `ValidityLike` 对象，`getCollapsibleContentVars` 拿的是尺寸对象，
  连元素都不需要。这些都由上层决定何时调用、调不调，这层自己永远不主动去取。
- 所有导出都有明确类型与 JSDoc；`__tests__` 下 13 个测试文件没有一个挂载 Vue 组件，其中 9 个声明
  `// @vitest-environment node`、在完全没有 DOM 的环境下跑通，另 `dom` `form` `toast` 三处的测试需要
  jsdom 提供真实元素——正是上一条那三个接收元素的模块。

## 版本与许可

许可 MIT。`sideEffects: false`，可安全 tree-shake。
发布产物含 `dist` 与 `src`，`src` 供源码级排查对照，不构成公共 API。
