import { effectScope, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useInput } from '../src/useInput';

import type { UseInputOptions } from '../src/useInput';
import type { EffectScope } from 'vue';

/**
 * 真实表单树上的 input 夹具。
 *
 * 值提交、IME 与 reset 都发生在真实 DOM 事件上，仓库没有 @vue/test-utils，
 * 因此直接建元素并交给 setControl，等价于模板 ref 的赋值时机。
 */
function setup(options: UseInputOptions = {}, inForm = true) {
  const form = document.createElement('form');
  const input = document.createElement('input');

  if (inForm) {
    form.append(input);
    document.body.append(form);
  } else {
    document.body.append(input);
  }

  const scope: EffectScope = effectScope();
  const api = scope.run(() => useInput(options));

  if (!api) throw new Error('composable 未在 effect scope 内创建');

  api.setControl(input);

  // 等价于 ui 层模板上的 @input / @compositionstart / @compositionend 绑定。
  input.addEventListener('input', api.onInput);
  input.addEventListener('compositionstart', api.onCompositionStart);
  input.addEventListener('compositionend', api.onCompositionEnd);

  return { api, input, form, scope };
}

/** 模拟用户敲键：写 DOM 值再派发 input 事件。 */
function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('受控与非受控', () => {
  it('非受控时输入提交到内部状态并回调', async () => {
    const onChanged = vi.fn();
    const { api, input, scope } = setup({ defaultValue: '初值', onModelValueChange: onChanged });

    expect(api.value.value).toBe('初值');

    type(input, '新值');
    await nextTick();

    expect(api.value.value).toBe('新值');
    expect(onChanged).toHaveBeenCalledWith('新值');

    scope.stop();
  });

  it('受控时内部状态不被改写，只回调；外部更新后跟随', async () => {
    const external = ref('a');
    const onChanged = vi.fn();
    const { api, input, scope } = setup({
      modelValue: () => external.value,
      onModelValueChange: onChanged,
    });

    type(input, 'ab');
    await nextTick();

    expect(onChanged).toHaveBeenCalledWith('ab');
    // 父级没应用新值，真源仍是旧值：这正是受控语义
    expect(api.value.value).toBe('a');

    external.value = 'ab';
    await nextTick();

    expect(api.value.value).toBe('ab');

    scope.stop();
  });

  it('受控被拒时把 DOM 拉回受控值，显示与存储不分叉', async () => {
    const { api, input, scope } = setup({ modelValue: () => '锁定' });

    type(input, '用户输入');
    await nextTick();

    expect(input.value).toBe('锁定');

    scope.stop();
  });

  it('setValue 走与用户输入同一条判定', async () => {
    const onChanged = vi.fn();
    const { api, scope } = setup({ onModelValueChange: onChanged });

    api.setValue('程序化');
    await nextTick();

    expect(api.value.value).toBe('程序化');
    expect(onChanged).toHaveBeenCalledWith('程序化');

    scope.stop();
  });
});

describe('IME 组合输入', () => {
  it('组合期间逐键 input 不提交，compositionend 一次性落最终值', async () => {
    const onChanged = vi.fn();
    const { api, input, scope } = setup({ onModelValueChange: onChanged });

    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));

    type(input, 'zhong');
    type(input, 'zhongwen');
    await nextTick();

    expect(onChanged).not.toHaveBeenCalled();
    expect(api.value.value).toBe('');

    input.value = '中文';
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    await nextTick();

    expect(api.value.value).toBe('中文');
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalledWith('中文');

    scope.stop();
  });

  it('组合结束后继续普通输入正常提交', async () => {
    const { api, input, scope } = setup();

    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = '中文';
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));

    type(input, '中文后续');
    await nextTick();

    expect(api.value.value).toBe('中文后续');

    scope.stop();
  });
});

describe('表单 reset', () => {
  it('reset 复原到创建时捕获的初值并通知外部', async () => {
    const onChanged = vi.fn();
    const { api, input, form, scope } = setup({ defaultValue: '初值', onModelValueChange: onChanged });

    type(input, '改过了');
    await nextTick();

    onChanged.mockClear();

    form.dispatchEvent(new Event('reset', { bubbles: true }));
    await nextTick();

    expect(api.value.value).toBe('初值');
    expect(onChanged).toHaveBeenCalledWith('初值');

    scope.stop();
  });

  it('运行期改 defaultValue 不影响 reset 目标', async () => {
    const defaultValue = ref('创建时');
    const { api, input, form, scope } = setup({ defaultValue: defaultValue.value });

    // reset 监听在 flush: post 的 watch 里挂上，先让出一拍等价于组件完成挂载。
    await nextTick();

    defaultValue.value = '后来改的';

    type(input, '改过了');
    form.dispatchEvent(new Event('reset', { bubbles: true }));
    await nextTick();

    expect(api.value.value).toBe('创建时');

    scope.stop();
  });
});

describe('属性表', () => {
  it('type 缺省 text，可透传任意合法 type', () => {
    const plain = setup();
    const email = setup({ type: 'email' });

    expect(plain.api.getRootProps().type).toBe('text');
    expect(email.api.getRootProps().type).toBe('email');

    plain.scope.stop();
    email.scope.stop();
  });

  it('禁用 / 只读 / 必填同时给原生属性与状态钩子', () => {
    const { api, scope } = setup({ disabled: true, readOnly: true, required: true });

    const props = api.getRootProps();

    expect(props.disabled).toBe(true);
    expect(props.readonly).toBe(true);
    expect(props.required).toBe(true);
    expect(props['data-disabled']).toBe('');
    expect(props['data-readonly']).toBe('');
    expect(props['aria-required']).toBe(true);

    scope.stop();
  });

  it('默认状态不输出原生属性与钩子', () => {
    const { api, scope } = setup();

    const props = api.getRootProps();

    expect(props.disabled).toBeUndefined();
    expect(props.readonly).toBeUndefined();
    expect(props.required).toBeUndefined();
    expect(props['data-disabled']).toBeUndefined();
    expect(props['aria-required']).toBeUndefined();

    scope.stop();
  });

  it('setControl 只认领 input / textarea 元素', () => {
    const { api, scope } = setup();

    api.setControl(document.createElement('div'));

    expect(api.control.value).toBeNull();

    scope.stop();
  });
});