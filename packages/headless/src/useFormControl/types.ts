import type { ComputedRef, Ref } from 'vue';

import type { ValiditySnapshot } from '@agile-plus/primitives/form';

import type { MaybeRefOrGetter } from 'vue';

/**
 * 可参与原生校验的控件。
 *
 * 只有这三类元素同时有 `validity`、`value` 与 `setCustomValidity`；本库的 Checkbox /
 * Switch 是 button 语义，没有 ValidityState，因此不能作为 FormControl 的替换目标，
 * 强行 asChild 会在校验那一刻什么也读不到。
 */
export type ValidatableControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * useFormControl 的配置项。
 */
export interface UseFormControlOptions {
  /**
   * 字段名。
   *
   * 在 FormField 内可省略；脱离 Field 时必须给，否则没有可写入的注册表键。
   *
   * @default undefined
   */
  name?: MaybeRefOrGetter<string | undefined>;

  /**
   * 控件元素 id。
   *
   * 在 FormField 内可省略（复用 Field 生成的 id，Label 的 for 与它同源）。
   *
   * @default undefined
   */
  id?: MaybeRefOrGetter<string | undefined>;

  /**
   * 消费者自己写在控件上的 `aria-describedby`。
   *
   * 需要显式交进来再合并：错误文案的 id 要追加在它后面，而属性表整体覆盖会丢掉消费者那份。
   *
   * @default undefined
   */
  describedby?: MaybeRefOrGetter<string | undefined>;
}

/**
 * useFormControl 的返回值。
 */
export interface UseFormControlReturn {
  /** 控件元素引用 */
  controlElement: Ref<ValidatableControl | null>;

  /**
   * 绑定控件元素，传给模板的 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  setControlElement(node: unknown): void;

  /** 当前字段的校验快照，未校验过时为 undefined */
  validity: ComputedRef<ValiditySnapshot | undefined>;

  /**
   * 控件的属性表。
   *
   * @returns id、name、data-valid / data-invalid、aria-invalid、aria-describedby、title。
   */
  getAttrs(): Record<string, unknown>;

  /**
   * 跑一次完整校验（原生状态 → 同步自定义匹配器 → 异步自定义匹配器）。
   *
   * 绑定到原生 `change`：这是 UX 决定——不应该每敲一个字符就跑一遍校验，
   * 异步匹配器更不该被逐键触发。
   */
  validate(): Promise<void>;

  /**
   * 用户改动值时的处理：清掉自定义错误与校验结果。
   *
   * 绑定到 `input`。留着上一次的错误会让用户以为「改了也没用」，
   * 因此这里只清不判，判定等 change（或提交时的 invalid）再做。
   */
  onControlInput(): void;

  /**
   * 控件的 invalid 处理器，绑定到 `@invalid`。
   *
   * 浏览器在校验失败时逐个派发，此时必须把结果读进注册表，否则文案不会出现。
   */
  onControlInvalid(): void;

  /**
   * 清空该字段的校验结果与自定义错误，并撤销 setCustomValidity。
   *
   * 表单 reset 时由内部自动调用，也可以由消费者在自行重置值后手动调用。
   */
  resetValidation(): void;
}
