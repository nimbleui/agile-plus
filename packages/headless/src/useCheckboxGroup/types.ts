import type { ComputedRef, MaybeRefOrGetter } from 'vue';

import type { CheckboxCheckedState } from '@agile-plus/primitives/checkbox';

/**
 * useCheckboxGroup Composable 的配置选项。
 *
 * 语义对齐 Radix Themes 的 `CheckboxGroup.Root`：组持有一个值数组，
 * 组内每一项通过自己的 value 在这个数组里取得勾选状态。
 *
 * 受控类参数使用 MaybeRefOrGetter 而非裸值，原因同 useDialog / useCheckbox。
 */
export interface UseCheckboxGroupOptions {
  /**
   * 受控的选中值集合，传入后进入受控模式。
   *
   * @default undefined
   */
  modelValue?: MaybeRefOrGetter<string[] | undefined>;

  /**
   * 非受控模式的初始选中值集合。
   *
   * @default []
   */
  defaultValue?: string[];

  /** 值集合变化回调，受控模式下必须提供 */
  onValueChange?: (values: string[]) => void;

  /**
   * 整组禁用，会传播到组内每一项。
   *
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 是否为必选组，只输出 aria-required。
   *
   * 不传播给单项的 required：单项 required 表示「这一项必须勾选」，
   * 与「组内至少选一个」是不同约束，混用会产生互相矛盾的校验语义。
   *
   * @default false
   */
  required?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 表单字段名，组内每一项的隐藏 input 共用它，提交时得到同名多值。
   *
   * 未提供时组内不渲染隐藏 input。
   *
   * @default undefined
   */
  name?: MaybeRefOrGetter<string | undefined>;

  /** 组标题元素 id，输出 aria-labelledby */
  ariaLabelledby?: MaybeRefOrGetter<string | undefined>;

  /** 组说明元素 id，输出 aria-describedby */
  ariaDescribedby?: MaybeRefOrGetter<string | undefined>;
}

/**
 * useCheckboxGroup Composable 的返回值。
 *
 * 契约与 Checkbox / RadioGroup 一致：get*Props 只返回可 v-bind 的属性。
 */
export interface UseCheckboxGroupReturn {
  /** 当前选中的值集合 */
  values: ComputedRef<string[]>;

  /** 整组是否禁用 */
  isDisabled: ComputedRef<boolean>;

  /**
   * 组级表单字段名，由组内每一项的隐藏 input 共用。
   *
   * input 由各项自己渲染（与 Switch 同一套 bubble input 接线），组容器上不放 input，
   * 因此提交时每个勾选项贡献一个同名值，不会出现重复来源。
   */
  name: ComputedRef<string | undefined>;

  /** 直接替换整个值集合 */
  setValues(next: string[]): void;

  /**
   * 勾选或取消组内某一项。
   *
   * @param value 该项的值。
   * @param checked 该项变化后的状态，半选按未勾选处理。
   */
  setItemChecked(value: string, checked: CheckboxCheckedState): void;

  /**
   * 判断组内某一项是否已勾选。
   *
   * @param value 该项的值。
   */
  isValueChecked(value: string): boolean;

  /** 获取组容器需要绑定的属性 */
  getRootProps(): Record<string, unknown>;
}
