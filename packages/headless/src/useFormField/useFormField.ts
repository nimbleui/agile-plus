import { computed, toValue, useId } from 'vue';

import { getFieldStateAttrs } from '@agile-plus/primitives/form';

import type { UseFormReturn } from '../useForm';

import type { UseFormFieldOptions, UseFormFieldReturn } from './types';

/**
 * 字段实例：一个 id、一个名字，加上从表单注册表里读到的校验结果。
 *
 * 由 FormField 创建并向下提供，Label 与 Control 复用同一个实例，因此三处的
 * `data-valid` / `data-invalid` 永远来自同一次判定，不会出现「文案说无效、控件还标着有效」。
 *
 * 这里不持有任何校验状态：判定结果写在表单的注册表里，字段只是按 name 去读。
 * 之所以不干脆把快照放在字段上，是因为 `Message` 可以脱离 Field 只靠 name 挂进来，
 * 状态放在字段上会让这种用法静默失效。
 *
 * @param options 字段名、服务端标记与可选 id。
 * @param form 所在表单的注册表。
 * @returns 字段状态与属性表。
 */
export function useFormField(
  options: UseFormFieldOptions,
  form: UseFormReturn
): UseFormFieldReturn {
  /**
   * useId 在 SSR 下与服务端渲染结果一致，不会造成注水不匹配；
   * 加前缀是为了不与消费者手写的 id 撞名。
   */
  const uid = useId();

  const name = computed(() => toValue(options.name));

  const id = computed(() => toValue(options.id) ?? `field-${uid}`);

  const serverInvalid = computed(() => toValue(options.serverInvalid) === true);

  const validity = computed(() => form.getFieldValidity(name.value));

  function getStateAttrs(): Record<string, unknown> {
    return getFieldStateAttrs({ validity: validity.value, serverInvalid: serverInvalid.value });
  }

  return { id, name, serverInvalid, validity, getStateAttrs };
}
