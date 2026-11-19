import type { UseTextControlOptions, UseTextControlReturn } from '../utils/useTextControl';

/**
 * useTextarea 的配置项。
 *
 * 与 useInput 相比没有 type：textarea 不接受该属性。rows / wrap 等原生属性
 * 由封装层透传，不进入值内核。
 */
export type UseTextareaOptions = UseTextControlOptions;

/**
 * useTextarea 的返回值。
 */
export interface UseTextareaReturn extends Omit<UseTextControlReturn, 'getBaseAttrs'> {
  /** 根元素属性表：原生状态属性 + data-* / aria 钩子 */
  getRootProps(): Record<string, unknown>;
}