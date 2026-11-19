import { useTextControl } from '../utils/useTextControl';

import type { UseTextareaOptions, UseTextareaReturn } from './types';

/**
 * Textarea 的 Vue Composable 适配。
 *
 * 与 useInput 共用 useTextControl 值内核，受控语义、IME 组合输入与表单 reset
 * 复原完全一致；差异只有渲染目标（textarea 没有 type 属性）。
 *
 * @param options Composable 配置项。
 * @returns 值、状态、根属性表与原生事件处理器。
 */
export function useTextarea(options: UseTextareaOptions = {}): UseTextareaReturn {
  const text = useTextControl(options);

  function getRootProps(): Record<string, unknown> {
    return text.getBaseAttrs();
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