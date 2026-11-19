import { effectScope, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTextarea } from '../src/useTextarea';

import type { UseTextareaOptions } from '../src/useTextarea';

/** 与 useInput 同一夹具形状，渲染目标换成 textarea。 */
function setup(options: UseTextareaOptions = {}) {
  const form = document.createElement('form');
  const textarea = document.createElement('textarea');

  form.append(textarea);
  document.body.append(form);

  const scope = effectScope();
  const api = scope.run(() => useTextarea(options));

  if (!api) throw new Error('composable 未在 effect scope 内创建');

  api.setControl(textarea);

  // 等价于 ui 层模板上的 @input / @compositionstart / @compositionend 绑定。
  textarea.addEventListener('input', api.onInput);
  textarea.addEventListener('compositionstart', api.onCompositionStart);
  textarea.addEventListener('compositionend', api.onCompositionEnd);

  return { api, textarea, form, scope };
}

function type(textarea: HTMLTextAreaElement, value: string): void {
  textarea.value = value;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useTextarea', () => {
  it('非受控输入提交并回调，与 useInput 同一值语义', async () => {
    const onChanged = vi.fn();
    const { api, textarea, scope } = setup({ defaultValue: '初值', onModelValueChange: onChanged });

    type(textarea, '多行\n内容');
    await nextTick();

    expect(api.value.value).toBe('多行\n内容');
    expect(onChanged).toHaveBeenCalledWith('多行\n内容');

    scope.stop();
  });

  it('受控时只回调不写内部', async () => {
    const external = ref('a');
    const { api, textarea, scope } = setup({ modelValue: () => external.value });

    type(textarea, 'ab');
    await nextTick();

    expect(api.value.value).toBe('a');

    scope.stop();
  });

  it('IME 组合期间不提交，结束后一次性落值', async () => {
    const onChanged = vi.fn();
    const { api, textarea, scope } = setup({ onModelValueChange: onChanged });

    textarea.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    type(textarea, 'zhong');
    await nextTick();

    expect(onChanged).not.toHaveBeenCalled();

    textarea.value = '中';
    textarea.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    await nextTick();

    expect(api.value.value).toBe('中');
    expect(onChanged).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('表单 reset 复原初值', async () => {
    const { api, textarea, form, scope } = setup({ defaultValue: '初值' });

    // reset 监听在 flush: post 的 watch 里挂上，先让出一拍等价于组件完成挂载。
    await nextTick();

    type(textarea, '改过了');
    form.dispatchEvent(new Event('reset', { bubbles: true }));
    await nextTick();

    expect(api.value.value).toBe('初值');

    scope.stop();
  });

  it('属性表不带 type，状态钩子与 input 一致', () => {
    const { api, scope } = setup({ disabled: true, required: true });

    const props = api.getRootProps();

    expect(props.type).toBeUndefined();
    expect(props.disabled).toBe(true);
    expect(props['data-disabled']).toBe('');
    expect(props['aria-required']).toBe(true);

    scope.stop();
  });
});