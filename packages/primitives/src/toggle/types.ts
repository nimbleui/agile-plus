/**
 * Toggle / ToggleGroup 的类型与常量。
 *
 * 对齐对象是 radix-ui/primitives 的 `packages/react/toggle/src/toggle.tsx` 与
 * `packages/react/toggle-group/src/toggle-group.tsx`（main 分支），外加
 * `packages/react/roving-focus/src/roving-focus-group.tsx` 的按键语义——Radix 的
 * ToggleGroup 键盘导航完全由 RovingFocusGroup 提供。
 */

/**
 * 选择模式，决定组的值形状与项的 ARIA 角色。
 *
 * - `single`：值为字符串，空字符串表示没有选中；组 `role="radiogroup"`，项换成
 *   `role="radio"` + `aria-checked`，并**移除** `aria-pressed`。
 * - `multiple`：值为字符串数组；组 `role="toolbar"`，项保留 `aria-pressed`。
 *
 * 单选组的 radio 角色是 Radix 的选择（点击已选中项可以取消，严格说与原生 radio
 * 语义不完全一致），本库照搬以保证与 Radix 的行为与读屏表现一致。
 */
export type ToggleGroupType = 'single' | 'multiple';

/**
 * 罗盘焦点的排布方向，决定哪一组方向键有效。
 *
 * 未提供时四个方向都能导航（Radix 的 orientation 是可选的）。
 */
export type ToggleGroupOrientation = 'horizontal' | 'vertical';

/**
 * 文本方向。RTL 下左右方向键互换，保证「前/后」与视觉顺序一致。
 */
export type ToggleGroupDirection = 'ltr' | 'rtl';

/**
 * 方向键想表达的焦点意图。
 */
export type ToggleRovingFocusIntent = 'first' | 'last' | 'prev' | 'next';

/**
 * 按键到焦点意图的映射，与 Radix 的 MAP_KEY_TO_FOCUS_INTENT 逐项一致。
 *
 * PageUp/PageDown 与 Home/End 同义：在没有可见滚动区的大型工具栏里，读屏用户
 * 常用前一组键位。
 */
export const ROVING_FOCUS_KEY_MAP: Readonly<Record<string, ToggleRovingFocusIntent>> = {
  ArrowLeft: 'prev',
  ArrowUp: 'prev',
  ArrowRight: 'next',
  ArrowDown: 'next',
  PageUp: 'first',
  Home: 'first',
  PageDown: 'last',
  End: 'last',
};

/**
 * 计算焦点意图的输入。
 */
export interface ToggleRovingFocusInput {
  /** `KeyboardEvent.key` 原始值，未做方向感知转换 */
  key: string;

  /** 组的排布方向，未提供时四个方向都有效 */
  orientation?: ToggleGroupOrientation;

  /** 文本方向 */
  dir: ToggleGroupDirection;

  /** 是否按下了 Shift / Ctrl / Alt / Meta，带修饰键时不接管按键 */
  hasModifierKey: boolean;
}

/**
 * 目标索引计算的输入。
 */
export interface ToggleRovingFocusTargetInput {
  /** 已解析出的焦点意图 */
  intent: ToggleRovingFocusIntent;

  /** 当前项在**可聚焦项列表**中的下标；不在列表内时为 -1 */
  currentIndex: number;

  /** 可聚焦项数量 */
  count: number;

  /** 到达两端后是否绕回另一端 */
  loop: boolean;
}

/**
 * 单项状态变化对组值的作用输入。
 */
export interface ToggleGroupValueInput {
  /** 组的类型，决定 single 是「替换」而 multiple 是「增删」 */
  type: ToggleGroupType;

  /** 变化前已选中的值集合（内部统一用数组表达） */
  value: string[];

  /** 触发变化的项的值 */
  itemValue: string;

  /** 该项点击后的按下状态，true 表示要选中它 */
  pressed: boolean;
}
