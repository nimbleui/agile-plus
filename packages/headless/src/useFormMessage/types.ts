import type { ComputedRef, Ref } from 'vue';

import type { CustomMatcher, ValidityMatcher } from '@agile-plus/primitives/form';

import type { MaybeRefOrGetter } from 'vue';

/**
 * useFormMessage 的配置项。
 */
export interface UseFormMessageOptions {
  /**
   * 命中的条件。
   *
   * - 不传：只要渲染就显示，用于服务端错误等与原生状态无关的文案。
   * - 字符串：命中对应的内置校验状态，例如 `valueMissing`、`typeMismatch`。
   * - 函数：自定义匹配，收到当前值与整份 `FormData`，可返回 Promise。
   *
   * 只接受「值」或「Ref」，不接受 getter：函数本身就是这里的合法取值，`toValue` 会把它
   * 当成 getter 先调用一次，等于在没有任何参数的情况下跑了一遍匹配器。
   *
   * @default undefined
   */
  match?: ValidityMatcher | CustomMatcher | Ref<ValidityMatcher | CustomMatcher | undefined>;

  /**
   * 无条件命中。
   *
   * 存在的理由只有一个：文案需要常驻 DOM 才能做进出场动画。平时不要用，否则错误文案
   * 会一直显示。
   *
   * @default false
   */
  forceMatch?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 归属的字段名。
   *
   * 在 FormField 内可省略；脱离 Field 时必须给，这是把文案挂到正确字段上的唯一依据。
   *
   * @default undefined
   */
  name?: MaybeRefOrGetter<string | undefined>;
}

/**
 * useFormMessage 的返回值。
 */
export interface UseFormMessageReturn {
  /** 文案元素 id，同时是自定义匹配器在错误表里的键 */
  id: string;

  /** 归属的字段名 */
  name: ComputedRef<string>;

  /** 当前是否应当显示 */
  matches: ComputedRef<boolean>;

  /**
   * 缺省文案：内置状态对应的英文原文，没有对应项时回落到通用文案。
   *
   * @returns 文案字符串。
   */
  getDefaultText(): string;
}
