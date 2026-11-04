import { computed, ref, toValue } from 'vue';

import { getSwitchAttrs, getSwitchDataState } from '@agile-plus/primitives/switch';
import { getHiddenInputAttrs } from '@agile-plus/primitives/form';

import { useBubbleInput } from '../utils/useBubbleInput';
import { useControllable } from '../utils/useControllable';

import type { UseSwitchOptions, UseSwitchReturn } from './types';

/**
 * Switch 的 Vue Composable 适配。
 *
 * 除了「一个布尔状态」，这里还承担 Radix 用 BubbleInput 解决的问题：`<button>` 内
 * 不允许再放交互元素，所以隐藏 input 作为按钮的兄弟节点、按按钮实测尺寸覆盖在其上。
 * 接线本身在 `useBubbleInput` 里只有一份，Checkbox 走同一条路径，因此尺寸跟随、
 * 写值与通知、reset 复原三件事不会在两个组件里各自漂移。这样原生表单能力（提交值、
 * required 校验、form 的 change 事件）都仍然成立，而指针事件照旧落在按钮上。
 *
 * 与 Radix 的一处有意差异：它派发的是 `click`（React 用冒泡的 click 推导 change），
 * 因此需要「用户点击 / 程序化更新」两套记账来保证祖先 onClick 不被重复触发；本库直接
 * 派发原生 `change`，只在值真的变化时通知，一次变化一次事件，不需要那套记账。对外可
 * 观察的表单行为等价，差异写进文档。
 *
 * @param options Composable 配置项。
 * @returns 状态、属性绑定函数与元素入口。
 */
export function useSwitch(options: UseSwitchOptions = {}): UseSwitchReturn {
  const state = useControllable<boolean>({
    value: () => toValue(options.checked),
    defaultValue: options.defaultChecked ?? false,
    onChange: (value) => options.onCheckedChange?.(value),
  });

  const checked = state.value;

  const isDisabled = computed(() => toValue(options.disabled) === true);

  const isRequired = computed(() => toValue(options.required) === true);

  const formId = computed(() => toValue(options.form));

  const submitValue = computed(() => toValue(options.value) ?? 'on');

  const id = computed(() => toValue(options.id));

  const control = ref<HTMLElement | null>(null);

  /** 表单 reset 要回到的值：在创建时捕获，与 Radix 的 initialCheckedStateRef 等价。 */
  const initialChecked = checked.value;

  const bubble = useBubbleInput({
    control,
    form: () => formId.value,
    checked: () => checked.value,
    onReset: () => setChecked(initialChecked),
  });

  function setChecked(value: boolean): void {
    state.set(value);
  }

  function toggle(): void {
    if (isDisabled.value) return;

    setChecked(!checked.value);
  }

  function onRootClick(): void {
    toggle();
  }

  function setControl(node: unknown): void {
    control.value = node instanceof HTMLElement ? node : null;
  }

  function getRootProps(): Record<string, unknown> {
    return {
      type: 'button',
      id: id.value || undefined,
      ...getSwitchAttrs({
        checked: checked.value,
        disabled: isDisabled.value,
        required: isRequired.value,
      }),
      disabled: isDisabled.value || undefined,
      // Radix 也把提交值写到按钮上：<button name value> 本身就是表单数据。
      // 本库的按钮不带 name，因此不会与隐藏 input 重复提交。
      value: submitValue.value,
    };
  }

  /**
   * 滑块的属性。
   *
   * 词表由 primitives 统一给出，UI 层不自己拼 `data-state` 字符串：滑块与按钮的状态
   * 必须来自同一份定义，否则样式层会出现「一个改了另一个没改」的隐性错位。
   */
  function getThumbProps(): Record<string, unknown> {
    return {
      'data-state': getSwitchDataState(checked.value),
      'data-disabled': isDisabled.value ? '' : undefined,
    };
  }

  /**
   * 隐藏 input 的属性与内联样式。
   *
   * `checked` 不在这里：选中态由 useBubbleInput 用原生 setter 写入并派发 change，
   * 用 attribute 绑定会让重渲染覆盖用户刚点下的值。
   *
   * @returns 不是表单控件时返回 null，此时不渲染 input。
   */
  function getInputProps(): Record<string, unknown> | null {
    if (!bubble.isFormControl.value) return null;

    return {
      ...getHiddenInputAttrs({
        type: 'checkbox',
        name: toValue(options.name),
        value: submitValue.value,
        disabled: isDisabled.value,
        required: isRequired.value,
        form: formId.value,
      }),
      style: bubble.style.value,
    };
  }

  return {
    checked,
    isDisabled,
    isFormControl: bubble.isFormControl,
    control,
    setControl,
    setInputElement: bubble.setInputElement,
    getRootProps,
    getThumbProps,
    getInputProps,
    setChecked,
    toggle,
    onRootClick,
  };
}
