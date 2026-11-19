import type { UseTextControlOptions, UseTextControlReturn } from '../utils/useTextControl';

import type { MaybeRefOrGetter } from 'vue';

/**
 * useInput 的配置项。
 */
export interface UseInputOptions extends UseTextControlOptions {
  /**
   * 原生 input 的 type。
   *
   * 不做词表限制：type 的合法取值由浏览器定义且持续演进，校验规则（required /
   * pattern / min 等）也随 type 变化，透传比枚举更诚实。
   *
   * @default 'text'
   */
  type?: MaybeRefOrGetter<string | undefined>;
}

/**
 * useInput 的返回值。
 *
 * 在文本值内核之上只多一个 getRootProps：把 type 并进属性表。
 * getBaseAttrs 不对外暴露——调用方只需要一份完整的根属性表。
 */
export interface UseInputReturn extends Omit<UseTextControlReturn, 'getBaseAttrs'> {
  /** 根元素属性表：type + 原生状态属性 + data-* / aria 钩子 */
  getRootProps(): Record<string, unknown>;
}