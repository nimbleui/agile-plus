import { onScopeDispose, toValue, watch } from 'vue';

import { isBrowser } from './env';

import type { MaybeRefOrGetter, Ref } from 'vue';

/**
 * 找到控件所属的表单。
 *
 * 显式 id 优先（控件可以放在 form 外面仍然归属它），否则先看原生 `form` 属性，
 * 再向上找最近的 form 元素。收窄到 HTMLFormElement 是因为要读它的事件能力，
 * closest 只给 Element。
 */
function resolveForm(
  element: HTMLElement | null,
  formId: string | undefined
): HTMLFormElement | null {
  if (!isBrowser) return null;

  if (formId) {
    const node = document.getElementById(formId);

    return node instanceof HTMLFormElement ? node : null;
  }

  // 原生 form 属性是「归属」的第一来源：input/button/select/textarea 都带它，
  // 其余元素没有这个字段，因此这里做结构判断而不是类型断言。
  const native = element && 'form' in element ? element.form : null;

  if (native instanceof HTMLFormElement) return native;

  const closest = element?.closest('form');

  return closest instanceof HTMLFormElement ? closest : null;
}

/**
 * 监听控件所属表单的 reset。
 *
 * `form.reset()` 会把原生值改回默认值，但组件状态是另一套真源：不接这个事件，
 * 控件的值与 `data-invalid`、错误文案就会各说各话。归属关系会随着控件元素或
 * 显式 id 变化，因此监听必须跟着一起迁移而不是在挂载时接一次。
 *
 * @param control 控件元素引用。
 * @param onReset reset 时的动作。
 * @param formId 显式归属的表单 id，优先级高于就近包含。
 */
export function useFormResetListener(
  control: Ref<HTMLElement | null>,
  onReset: () => void,
  formId?: MaybeRefOrGetter<string | undefined>
): void {
  let target: HTMLFormElement | null = null;

  function detach(): void {
    if (!target) return;

    target.removeEventListener('reset', onReset);
    target = null;
  }

  watch(
    [control, () => toValue(formId)],
    ([element, nextFormId]) => {
      detach();

      if (!isBrowser) return;

      const form = resolveForm(element, nextFormId);

      if (!form) return;

      form.addEventListener('reset', onReset);
      target = form;
    },
    { flush: 'post' }
  );

  onScopeDispose(detach);
}
