import { computed, ref, toValue } from 'vue';

import {
  getCheckboxAttrs,
  isCheckboxIndicatorPresent,
  resolveNextChecked,
} from '@agile-plus/primitives/checkbox';
import { getHiddenInputAttrs } from '@agile-plus/primitives/form';

import { useBubbleInput } from '../utils/useBubbleInput';
import { useControllable } from '../utils/useControllable';

import type { CheckboxCheckedState } from '@agile-plus/primitives/checkbox';

import type { UseCheckboxOptions, UseCheckboxReturn } from './types';

/**
 * Checkbox 的 Vue Composable 适配。
 *
 * 三态选中值、属性表与隐藏 input 三块：input 走与 Switch 同一份 `useBubbleInput`，
 * 差别只在写进原生控件的是「是否选中」这个布尔——半选是 DOM property 而非 attribute，
 * 无法由属性表表达，必须由 UI 层在 `inputElement` 上赋值。
 *
 * 支持受控与非受控两种模式。
 *
 * @param options Composable 配置选项。
 * @returns 响应式状态、操作方法和属性绑定函数集合。
 */
export function useCheckbox(options: UseCheckboxOptions = {}): UseCheckboxReturn {
  const { defaultChecked = false } = options;

  const state = useControllable<CheckboxCheckedState>({
    value: () => toValue(options.checked),
    defaultValue: defaultChecked,
    onChange: (next) => options.onCheckedChange?.(next),
  });

  const checked = state.value;

  const isDisabled = computed(() => toValue(options.disabled) === true);

  const isRequired = computed(() => toValue(options.required) === true);

  const isIndicatorPresent = computed(() => isCheckboxIndicatorPresent(checked.value));

  const control = ref<HTMLElement | null>(null);

  /**
   * reset 要回到的值：在创建时捕获。
   *
   * 组内模式下它是「初次出现时该项是否在组的值数组里」，与浏览器给 input 的
   * defaultChecked 快照同源，因此两边恢复到的状态始终一致。
   */
  const initialChecked = checked.value;

  const bubble = useBubbleInput({
    control,
    checked: () => checked.value === true,
    onReset: () => setChecked(initialChecked),
  });

  function setChecked(next: CheckboxCheckedState): void {
    state.set(next);
  }

  /**
   * 按点击语义切换。
   *
   * 禁用时直接返回：按钮元素上的原生 disabled 已经能挡住点击，这里再挡一次
   * 是因为父级可能通过 label 关联触发，也可能在受控模式下由外部直接调用。
   */
  function toggle(): void {
    if (isDisabled.value) return;

    setChecked(resolveNextChecked(checked.value));
  }

  function setControl(node: unknown): void {
    control.value = node instanceof HTMLElement ? node : null;
  }

  function getRootProps(): Record<string, unknown> {
    const id = toValue(options.id);

    return {
      type: 'button',
      role: 'checkbox',
      id: id || undefined,
      ...getCheckboxAttrs({
        checked: checked.value,
        disabled: isDisabled.value,
        required: isRequired.value,
      }),
      disabled: isDisabled.value || undefined,
    };
  }

  /**
   * 获取隐藏 input 的属性与内联样式。
   *
   * `checked` 不在属性表里：它由 useBubbleInput 用原生 setter 写入并派发 change，
   * 绑成 attribute 会让重渲染把用户刚点下的值改回去。`indeterminate` 是对应的
   * DOM property，同样无法在这里表达，由 UI 层在元素引用上赋值。
   *
   * @returns 控件不在表单内时返回 null，此时不渲染 input。
   */
  function getInputProps(): Record<string, unknown> | null {
    if (!bubble.isFormControl.value) return null;

    return {
      ...getHiddenInputAttrs({
        type: 'checkbox',
        name: toValue(options.name),
        value: toValue(options.value) ?? 'on',
        disabled: isDisabled.value,
        required: isRequired.value,
      }),
      style: bubble.style.value,
    };
  }

  function onRootClick(): void {
    toggle();
  }

  return {
    checked,
    isDisabled,
    isFormControl: bubble.isFormControl,
    isIndicatorPresent,
    control,
    setControl,
    inputElement: bubble.inputElement,
    setInputElement: bubble.setInputElement,
    setChecked,
    toggle,
    getRootProps,
    getInputProps,
    onRootClick,
  };
}
