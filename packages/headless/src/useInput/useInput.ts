import { toValue } from 'vue';

import { useTextControl } from '../utils/useTextControl';

import type { UseInputOptions, UseInputReturn } from './types';

/**
 * Input 的 Vue Composable 适配。
 *
 * 值真源、IME 组合输入与表单 reset 复原都在 useTextControl 里只有一份，
 * 这里只补 input 独有的 type 属性。Textarea 走同一个内核，因此两个组件的
 * 受控语义与组合输入行为不会各自漂移。
 *
 * @param options Composable 配置项。
 * @returns 值、状态、根属性表与原生事件处理器。
 */
export function useInput(options: UseInputOptions = {}): UseInputReturn {
  const text = useTextControl(options);

  function getRootProps(): Record<string, unknown> {
    return {
      type: toValue(options.type) ?? 'text',
      ...text.getBaseAttrs(),
    };
  }

  return {
    value: text.value,
    isDisabled: text.isDisabled,
    isReadOnly: text.isReadOnly,
    isRequired: text.isRequired,
    control: text.control,
    setControl: text.setControl,
    setValue: text.setValue,
    getRootProps,
    onInput: text.onInput,
    onCompositionStart: text.onCompositionStart,
    onCompositionEnd: text.onCompositionEnd,
  };
}