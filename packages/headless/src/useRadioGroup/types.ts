import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/**
 * RadioGroup 的排列方向。
 *
 * 与 Tabs 不同，方向不改变按键映射：radio group 遵循原生行为，
 * 上下左右四个方向键都能导航。该值只用于输出 aria-orientation。
 */
export type RadioGroupOrientation = 'horizontal' | 'vertical';

/**
 * useRadioGroup Composable 的配置选项。
 *
 * 同时支持受控与非受控两种模式：
 * - 非受控：仅传 defaultValue，内部维护选中值。
 * - 受控：传入 modelValue + onValueChange，外部控制选中值。
 *
 * 受控类参数使用 MaybeRefOrGetter 而非裸值：组件封装层传入的是响应式 props，
 * 裸值会在展开时固化为快照，导致外部状态变化后界面不再响应。
 */
export interface UseRadioGroupOptions {
  /** 受控选中值，传入后进入受控模式；空字符串表示受控地清空选择 */
  modelValue?: MaybeRefOrGetter<string | undefined>;

  /**
   * 非受控模式的初始选中值。
   *
   * 允许为空，radio 语义支持「未填写」初始态，与 Tabs 必须存在激活项不同。
   *
   * @default ''
   */
  defaultValue?: string;

  /** 选中值变化回调，受控模式下必须提供 */
  onValueChange?: (value: string) => void;

  /**
   * 整组禁用。
   *
   * 禁用后所有 item 不可交互、不可通过键盘到达，导航列表变为空。
   *
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 是否为必选组，输出 aria-required。
   *
   * @default false
   */
  required?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 键盘导航到达边界后是否循环到另一端。
   *
   * @default true
   */
  loop?: boolean;

  /**
   * 排列方向，仅用于输出 aria-orientation。
   *
   * @default 'horizontal'
   */
  orientation?: MaybeRefOrGetter<RadioGroupOrientation | undefined>;

  /** 指向组标题元素 id 的输出 aria-labelledby，由消费者自行关联标签元素 */
  ariaLabelledby?: MaybeRefOrGetter<string | undefined>;

  /** 指向组说明元素 id 的输出 aria-describedby，由消费者自行关联说明元素 */
  ariaDescribedby?: MaybeRefOrGetter<string | undefined>;

  /**
   * 表单提交用的字段名，对应隐藏 input 的 name。
   *
   * 未提供时不渲染隐藏 input：没有提交目标的情况下多出的原生控件只会带来
   * 额外的焦点与分组行为。
   */
  name?: MaybeRefOrGetter<string | undefined>;
}

/**
 * item 注册表条目。
 *
 * 只记录顺序与禁用态：顺序决定键盘导航与首个可聚焦项，
 * 禁用态需要集中可见，否则无法跳过禁用项，也无法确定唯一 tab stop。
 */
export interface RadioGroupItemEntry {
  /** item 的唯一值 */
  value: string;

  /**
   * 该 item 是否单独禁用。
   *
   * 不含整组禁用情形，最终可用性由 Composable 合并组级 disabled 得出。
   */
  disabled: boolean;
}

/**
 * useRadioGroup Composable 的返回值。
 *
 * 契约与 Dialog / Tabs 一致：get*Props 只返回可 v-bind 的 ARIA 属性，
 * 事件通过 v-on 单独绑定。
 */
export interface UseRadioGroupReturn {
  /** 当前选中值，空字符串表示未选中 */
  value: ComputedRef<string>;

  /** 整组是否被禁用 */
  isGroupDisabled: ComputedRef<boolean>;

  /** 设置选中值，不校验目标是否禁用，由调用方决定 */
  setValue(value: string): void;

  /**
   * 注册一个 item。
   *
   * 由 RadioGroupItem 在 setup 阶段调用，重复注册幂等忽略。
   * 注册顺序即键盘导航顺序，必须与视觉顺序一致。
   */
  registerItem(value: string): void;

  /** 更新 item 的禁用态，由 RadioGroupItem 在 props.disabled 变化时调用 */
  setItemDisabled(value: string, disabled: boolean): void;

  /** 注销 item，由 RadioGroupItem 卸载时调用；若注销的是选中项则清空选中 */
  unregisterItem(value: string): void;

  /**
   * 判断 item 是否不可交互。
   *
   * 合并整组禁用与单项禁用，供 UI 层决定 data-disabled 与 tabindex。
   */
  isItemDisabled(value: string): boolean;

  /** 获取组容器需要绑定的 ARIA 属性 */
  getRootProps(): Record<string, unknown>;

  /**
   * 获取单个 item 需要绑定的 ARIA 属性。
   *
   * 纯读取函数，可安全放入 computed 随状态重新求值。
   *
   * @param value 该 item 的唯一值。
   */
  getItemProps(value: string): Record<string, unknown>;

  /**
   * 是否应当渲染隐藏的原生 input。
   *
   * 由是否提供 name 决定，UI 层据此控制 DOM 是否存在。
   */
  hasName: ComputedRef<boolean>;

  /**
   * 获取隐藏 input 需要绑定的属性。
   *
   * 未提供 name 时返回 null，UI 层应跳过渲染。禁用项同样输出 disabled，
   * 让浏览器在提交时自然忽略它，而不是由组件模拟一套选择规则。
   *
   * @param value 该选项的唯一值。
   * @returns 可 v-bind 的属性，或 null。
   */
  getInputProps(value: string): Record<string, unknown> | null;

  /**
   * item 键盘导航处理器，绑定到 item 的 @keydown。
   *
   * @param event 原生键盘事件。
   */
  onItemKeydown(event: KeyboardEvent): void;
}
