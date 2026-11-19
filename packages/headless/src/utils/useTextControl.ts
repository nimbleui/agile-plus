import { computed, ref, toValue } from 'vue';

import { getInputAttrs } from '@agile-plus/primitives/input';

import { useControllable } from './useControllable';
import { useFormResetListener } from './useFormResetListener';

import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

/**
 * 文本输入控件（input / textarea）的共享配置。
 *
 * 两个组件的值语义完全一致：字符串受控 / 非受控、IME 组合输入、表单 reset 复原。
 * 差异只在渲染目标与个别属性（input 有 type），因此值内核抽在这里共用一份，
 * useInput / useTextarea 各自只做属性表的薄封装。
 */
export interface UseTextControlOptions {
  /**
   * 受控值来源。
   *
   * **`undefined` 就是「未受控」的唯一判据**：封装层必须让 prop 缺省保持 undefined，
   * 被 cast 成空串会让组件变成「受控且恒为空」，非受控用法静默失效。
   */
  modelValue?: MaybeRefOrGetter<string | undefined>;

  /**
   * 非受控模式的初始值。
   *
   * @default ''
   */
  defaultValue?: string;

  /** 是否禁用 */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /** 是否只读 */
  readOnly?: MaybeRefOrGetter<boolean | undefined>;

  /** 是否必填 */
  required?: MaybeRefOrGetter<boolean | undefined>;

  /** 显式指定所属表单的 id，用于控件放在 form 外部的场景 */
  form?: MaybeRefOrGetter<string | undefined>;

  /** 值变化回调，受控模式下同样触发，是新值唯一的落地路径 */
  onModelValueChange?: (value: string) => void;
}

/**
 * useTextControl 的返回值。
 */
export interface UseTextControlReturn {
  /** 当前值：受控时跟随外部来源，否则是内部状态 */
  value: ComputedRef<string>;

  /** 是否禁用 */
  isDisabled: ComputedRef<boolean>;

  /** 是否只读 */
  isReadOnly: ComputedRef<boolean>;

  /** 是否必填 */
  isRequired: ComputedRef<boolean>;

  /** 控件元素引用 */
  control: Ref<HTMLInputElement | HTMLTextAreaElement | null>;

  /** 绑定控件元素，传给模板的 `:ref` 或 Slot 的 elRef */
  setControl(node: unknown): void;

  /** 程序化写值，走与用户输入同一条受控 / 非受控判定 */
  setValue(value: string): void;

  /** 原生属性与状态钩子：disabled / readonly / required / data-* / aria-required */
  getBaseAttrs(): Record<string, unknown>;

  /** 原生 input 事件处理器；IME 组合期间不提交 */
  onInput(event: Event): void;

  /** 原生 compositionstart 处理器 */
  onCompositionStart(): void;

  /** 原生 compositionend 处理器：组合结束后一次性提交最终值 */
  onCompositionEnd(event: Event): void;
}

/**
 * 文本输入控件的值内核。
 *
 * IME 处理是这里存在的核心理由：中文输入法在 composition 期间逐键派发 input，
 * 此时提交会把拼音碎片写进值真源；因此组合期间只记标记不提交，compositionend
 * 一次性落最终值。受控模式下父级若拒绝新值，DOM 与真源会分叉，提交后立即把
 * DOM 拉回受控值，保证「看到的」与「存下的」一致。
 *
 * 表单 reset 复原到**创建时捕获的初值**（与 useSwitch 的 initialChecked 同一约定）：
 * 原生 reset 只改 DOM 值，组件状态是另一套真源，不接 reset 事件两者就会各说各话。
 *
 * @param options 受控来源、默认值与状态配置。
 * @returns 值、状态、属性表与三个原生事件处理器。
 */
export function useTextControl(options: UseTextControlOptions = {}): UseTextControlReturn {
  const state = useControllable<string>({
    value: () => toValue(options.modelValue),
    defaultValue: options.defaultValue ?? '',
    onChange: (value) => options.onModelValueChange?.(value),
  });

  const isDisabled = computed(() => toValue(options.disabled) === true);

  const isReadOnly = computed(() => toValue(options.readOnly) === true);

  const isRequired = computed(() => toValue(options.required) === true);

  const control = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const isComposing = ref(false);

  /** 表单 reset 要回到的值：在创建时捕获，运行期改 defaultValue 不影响它。 */
  const initialValue = state.value.value;

  useFormResetListener(
    control,
    () => state.set(initialValue),
    () => toValue(options.form)
  );

  function setControl(node: unknown): void {
    control.value =
      node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement ? node : null;
  }

  function setValue(value: string): void {
    state.set(value);
  }

  /** 从事件目标读值提交；受控被拒时把 DOM 拉回真源，避免显示与存储分叉。 */
  function commitFromElement(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;

    state.set(target.value);

    if (control.value && control.value.value !== state.value.value) {
      control.value.value = state.value.value;
    }
  }

  function onInput(event: Event): void {
    if (isComposing.value) return;

    commitFromElement(event);
  }

  function onCompositionStart(): void {
    isComposing.value = true;
  }

  function onCompositionEnd(event: Event): void {
    isComposing.value = false;

    commitFromElement(event);
  }

  function getBaseAttrs(): Record<string, unknown> {
    return {
      disabled: isDisabled.value || undefined,
      readonly: isReadOnly.value || undefined,
      required: isRequired.value || undefined,
      ...getInputAttrs({
        disabled: isDisabled.value,
        readOnly: isReadOnly.value,
        required: isRequired.value,
      }),
    };
  }

  return {
    value: state.value,
    isDisabled,
    isReadOnly,
    isRequired,
    control,
    setControl,
    setValue,
    getBaseAttrs,
    onInput,
    onCompositionStart,
    onCompositionEnd,
  };
}