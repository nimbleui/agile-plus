import { computed, isRef, onScopeDispose, toValue, useId, watchEffect } from 'vue';

import {
  BUILT_IN_VALIDITY_MESSAGES,
  DEFAULT_INVALID_MESSAGE,
  getMessageMatch,
} from '@agile-plus/primitives/form';

import type { CustomMatcher, ValidityMatcher } from '@agile-plus/primitives/form';

import type { Ref } from 'vue';

import type { UseFormReturn } from '../useForm';

import type { UseFormFieldReturn } from '../useFormField';

import type { UseFormMessageOptions, UseFormMessageReturn } from './types';

/**
 * 取出 match 的当前值。
 *
 * 这里不能用 `toValue`：函数本身就是这条 API 的合法取值（自定义匹配器），而 `toValue`
 * 会把函数当成 getter 调用一次，于是匹配器在毫无参数的情况下被执行。因此只接受「值」
 * 或「Ref」两种形态。
 */
function resolveMatch(
  match:
    ValidityMatcher | CustomMatcher | Ref<ValidityMatcher | CustomMatcher | undefined> | undefined
): ValidityMatcher | CustomMatcher | undefined {
  if (match === undefined) return undefined;

  return isRef(match) ? match.value : match;
}

/**
 * 一条错误文案的命中判定与登记。
 *
 * 两个登记动作决定了这条文案能被控件「看见」：
 *
 * 1. **id 进字段的说明列表**：控件的 `aria-describedby` 只包含当前正在显示的文案，
 *    没显示的不能占位——否则读屏会念出一串空引用。
 * 2. **函数式 match 进字段的匹配器清单**：匹配结果由控件在校验那一刻统一跑，
 *    文案自己不去读控件的值。这样才能拿到跨字段比较所需的同一份 `FormData`，
 *    也保证「原生错误优先」这条规则只实现一遍。
 *
 * 登记随实例的销毁自动撤销，所以文案可以随 `v-if` 反复出现消失，注册表不会积累脏条目。
 *
 * @param options 命中条件、forceMatch 与字段名。
 * @param form 所在表单的注册表。
 * @param field 所在字段的实例，可省略。
 * @returns id、是否显示与缺省文案。
 * @throws 既不在字段内、又没有显式 name 时抛出。
 */
export function useFormMessage(
  options: UseFormMessageOptions,
  form: UseFormReturn,
  field?: UseFormFieldReturn
): UseFormMessageReturn {
  const name = toValue(options.name) ?? field?.name.value;

  if (!name) {
    throw new Error('useFormMessage 需要 name：请把它放进 useFormField，或显式提供 name。');
  }

  const uid = useId();

  const id = `message-${uid}`;

  const match = computed(() => resolveMatch(options.match));

  const matches = computed(() =>
    getMessageMatch({
      match: match.value as ValidityMatcher | CustomMatcher | undefined,
      validity: form.getFieldValidity(name),
      customErrors: form.getFieldCustomErrors(name),
      messageId: id,
      forceMatch: toValue(options.forceMatch) === true,
    })
  );

  // 只有正在显示的文案才进 aria-describedby；隐藏中的 forceMatch 文案同样算显示。
  watchEffect((onCleanup) => {
    if (!matches.value) return;

    form.addFieldMessageId(name, id);
    onCleanup(() => form.removeFieldMessageId(name, id));
  });

  // 函数式 match 注册成匹配器。异步与否在这里不区分：区分发生在控件校验的那一刻，
  // 因为只有它拿得到当前值与 FormData。
  watchEffect((onCleanup) => {
    const current = match.value;

    if (typeof current !== 'function') return;

    form.addFieldMatcher(name, { id, match: current });
    onCleanup(() => form.removeFieldMatcher(name, id));
  });

  function getDefaultText(): string {
    const current = match.value;

    // 函数式与未提供 match 都没有可推导的原文，只能给通用文案；
    // 字符串 match 才有内置文案表。
    if (typeof current !== 'string') return DEFAULT_INVALID_MESSAGE;

    return BUILT_IN_VALIDITY_MESSAGES[current] ?? DEFAULT_INVALID_MESSAGE;
  }

  onScopeDispose(() => {
    form.removeFieldMessageId(name, id);
    form.removeFieldMatcher(name, id);
  });

  return { id, name: computed(() => name), matches, getDefaultText };
}
