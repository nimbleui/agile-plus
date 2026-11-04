import type { ComputedRef } from 'vue';

import type { ValiditySnapshot } from '@agile-plus/primitives/form';

import type { MaybeRefOrGetter } from 'vue';

/**
 * useFormField 的配置项。
 *
 * 全部用 MaybeRefOrGetter：字段的 name 与服务端标记都可能被上层改成响应式来源，
 * 裸值会在展开瞬间固化成快照。
 */
export interface UseFormFieldOptions {
  /**
   * 字段名，同时是原生控件的 `name`。
   *
   * 它是整张注册表的键：Field、Label、Control、Message 靠它对齐到同一份校验结果，
   * 所以同一个表单内不能重复。
   */
  name: MaybeRefOrGetter<string>;

  /**
   * 服务端判定该字段无效。
   *
   * 组件不保存服务端错误内容，只接这个布尔标记：错误文案由消费者自己渲染。
   * 它会把 `data-invalid` 打开、让 `data-valid` 不出现，并让控件带上 `aria-invalid`。
   *
   * @default false
   */
  serverInvalid?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 控件元素 id。
   *
   * 不提供时由本 Composable 生成：Label 的 `for` 与 Control 的 `id` 必须同源，
   * 让消费者各写一遍是重复且容易写歪的。
   *
   * @default undefined
   */
  id?: MaybeRefOrGetter<string | undefined>;
}

/**
 * useFormField 的返回值。
 */
export interface UseFormFieldReturn {
  /** 控件 id，Label 与 Control 共用 */
  id: ComputedRef<string>;

  /** 字段名 */
  name: ComputedRef<string>;

  /** 服务端是否判定该字段无效 */
  serverInvalid: ComputedRef<boolean>;

  /** 当前校验快照，未校验过时为 undefined */
  validity: ComputedRef<ValiditySnapshot | undefined>;

  /**
   * Field / Label / Control 共用的状态属性表。
   *
   * @returns data-valid / data-invalid。
   */
  getStateAttrs(): Record<string, unknown>;
}
