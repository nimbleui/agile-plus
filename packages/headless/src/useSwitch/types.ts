import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

/**
 * useSwitch 的配置项。
 *
 * 属性集合对齐 radix-ui `SwitchProvider` 的 props：`checked` / `defaultChecked` /
 * `required` / `onCheckedChange` / `name` / `form` / `disabled` / `value`；
 * `id` 是本库为 label 关联补的一项，与 Checkbox 保持一致。
 */
export interface UseSwitchOptions {
  /**
   * 受控状态，传入后进入受控模式。
   *
   * `undefined` 表示未受控。封装层的 Boolean prop 缺省会被 cast 成 false，
   * 必须显式留 undefined，否则非受控用法会被锁死在关闭状态。
   */
  checked?: MaybeRefOrGetter<boolean | undefined>;

  /** 非受控模式的初始状态，默认 false */
  defaultChecked?: boolean;

  /** 是否禁用 */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /** 是否必填，输出 aria-required，并让隐藏 input 参与原生表单校验 */
  required?: MaybeRefOrGetter<boolean | undefined>;

  /** 表单字段名；未提供时隐藏 input 不带 name，但仍参与事件与校验 */
  name?: MaybeRefOrGetter<string | undefined>;

  /** 提交值，默认 'on'，与原生 checkbox 一致 */
  value?: MaybeRefOrGetter<string | undefined>;

  /** 控件 id，供 label 的 for 关联 */
  id?: MaybeRefOrGetter<string | undefined>;

  /**
   * 显式指定所属表单的 id。
   *
   * 控件不在 `<form>` 内部时用它关联，语义与原生 input 的 form 属性相同。
   */
  form?: MaybeRefOrGetter<string | undefined>;

  /** 状态变化回调 */
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * useSwitch 的返回值。
 *
 * 契约：get*Props 只返回可 v-bind 的属性，事件处理器单独暴露给 v-on。
 */
export interface UseSwitchReturn {
  /** 当前是否打开 */
  checked: ComputedRef<boolean>;

  /** 当前是否禁用 */
  isDisabled: ComputedRef<boolean>;

  /** 是否作为表单控件存在，决定要不要渲染隐藏的 bubble input */
  isFormControl: ComputedRef<boolean>;

  /** 按钮元素引用，尺寸跟随与表单关联都靠它 */
  control: Ref<HTMLElement | null>;

  /**
   * 绑定按钮元素，传给模板的 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  setControl(node: unknown): void;

  /**
   * 绑定隐藏 input 元素，传给模板的 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  setInputElement(node: unknown): void;

  /** 获取按钮属性：type、role、aria-*、data-state、data-disabled、value、disabled */
  getRootProps(): Record<string, unknown>;

  /**
   * 获取滑块属性。
   *
   * 词表与按钮一致（`checked` / `unchecked`），由 primitives 单点定义。
   */
  getThumbProps(): Record<string, unknown>;

  /**
   * 获取隐藏 input 的属性与内联样式。
   *
   * @returns 不是表单控件时返回 null，此时不渲染 input。
   */
  getInputProps(): Record<string, unknown> | null;

  /**
   * 写入状态。
   *
   * @param value 目标状态。
   */
  setChecked(value: boolean): void;

  /** 切换开关，禁用时不响应 */
  toggle(): void;

  /** 按钮点击处理器，绑定到 @click */
  onRootClick(): void;
}
