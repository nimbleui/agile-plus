import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

import type { CheckboxCheckedState } from '@agile-plus/primitives/checkbox';

/**
 * useCheckbox Composable 的配置选项。
 *
 * 属性名与默认值对齐 Radix 的 Checkbox.Root。受控类参数使用 MaybeRefOrGetter
 * 而非裸值：组件封装层传入的是响应式 props，裸值会在展开时固化为快照。
 */
export interface UseCheckboxOptions {
  /**
   * 受控选中状态，传入后进入受控模式。
   *
   * 允许 `'indeterminate'`，此时 aria-checked 为 mixed。
   *
   * @default undefined
   */
  checked?: MaybeRefOrGetter<CheckboxCheckedState | undefined>;

  /**
   * 非受控模式的初始状态。
   *
   * 需要初始为半选时传 `'indeterminate'`；Radix 另有一个 defaultIndeterminate，
   * 本库用单一取值表达，避免两个字段之间出现「defaultChecked=true 且
   * defaultIndeterminate=true」这类互相矛盾的输入。
   *
   * @default false
   */
  defaultChecked?: CheckboxCheckedState;

  /**
   * 状态变化回调，受控模式下必须提供。
   *
   * 参数是新的三态值而非布尔：半选由父级根据子项设置，不会被点击路径产生。
   */
  onCheckedChange?: (value: CheckboxCheckedState) => void;

  /**
   * 是否禁用。
   *
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 是否为必选控件，同时输出 aria-required 与隐藏 input 的 required。
   *
   * @default false
   */
  required?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 表单字段名，对应隐藏 input 的 name。
   *
   * 未提供时 input 不带 name，不再贡献提交值，但仍然参与 change 事件与 required 校验。
   *
   * @default undefined
   */
  name?: MaybeRefOrGetter<string | undefined>;

  /**
   * 提交时该 input 携带的值，与 CheckboxGroup 收集的值对应。
   *
   * @default 'on'
   */
  value?: MaybeRefOrGetter<string | undefined>;

  /**
   * 元素 id，供 label 的 for 关联。
   *
   * @default undefined
   */
  id?: MaybeRefOrGetter<string | undefined>;
}

/**
 * useCheckbox Composable 的返回值。
 *
 * 契约与 Dialog / Tabs / RadioGroup 一致：get*Props 只返回可 v-bind 的属性，
 * 事件通过 v-on 单独绑定。
 */
export interface UseCheckboxReturn {
  /** 当前三态选中值 */
  checked: ComputedRef<CheckboxCheckedState>;

  /** 是否禁用 */
  isDisabled: ComputedRef<boolean>;

  /**
   * 是否作为表单控件存在，决定要不要渲染隐藏的 bubble input。
   *
   * 判定只看「在不在表单里」，不看有没有 name：没有 name 时原生 checkbox 依然参与
   * required 校验，而提交值缺失是使用方自己的选择。
   */
  isFormControl: ComputedRef<boolean>;

  /**
   * Indicator 是否应当存在于 DOM。
   *
   * 对齐 Radix：选中或半选时为 true；UI 层结合 forceMount 决定最终挂载。
   */
  isIndicatorPresent: ComputedRef<boolean>;

  /** 触发元素引用，隐藏 input 的尺寸跟随与表单归属判定都靠它 */
  control: Ref<HTMLElement | null>;

  /**
   * 绑定触发元素，传给模板的 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  setControl(node: unknown): void;

  /** 隐藏 input 的元素引用，`indeterminate` 只能在这里直接赋值 */
  inputElement: Ref<HTMLInputElement | null>;

  /**
   * 绑定隐藏 input 元素，传给模板的 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  setInputElement(node: unknown): void;

  /** 直接设置状态，供父级根据子项推导半选时使用 */
  setChecked(next: CheckboxCheckedState): void;

  /**
   * 按点击语义切换状态。
   *
   * 半选会被明确化为选中，而不是取消；禁用时不产生变化。
   */
  toggle(): void;

  /** 获取触发元素需要绑定的属性（button 元素本身的状态由 UI 层给出） */
  getRootProps(): Record<string, unknown>;

  /**
   * 获取隐藏 input 需要绑定的属性与内联样式。
   *
   * `indeterminate` 是对应的 DOM property 而非 attribute，无法在这里表达，
   * 由 UI 层在 `inputElement` 上直接赋值。
   *
   * @returns 属性集合，控件不在表单内时为 null。
   */
  getInputProps(): Record<string, unknown> | null;

  /** 触发元素点击处理器，绑定到 `@click` */
  onRootClick(): void;
}
