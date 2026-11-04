import { nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountFormControl } from './helpers/form-control';

import { useSwitch } from '../src/useSwitch';

import type { UseSwitchOptions } from '../src/useSwitch';

/**
 * 挂到真实表单树上跑 useSwitch，元素交给 setControl / setInputElement。
 *
 * DOM 结构与 scope 生命周期由 helpers/form-control 提供，这里只补 Switch 的属性绑定。
 */
function setup(options: UseSwitchOptions = {}, inForm = true) {
  const fixture = mountFormControl(() => useSwitch(options), inForm);

  fixture.api.setControl(fixture.control);
  fixture.api.setInputElement(fixture.input);

  return fixture;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('状态与属性', () => {
  it('非受控时点击翻转状态并回调', async () => {
    const onChanged = vi.fn();

    const { api, scope } = setup({ onCheckedChange: onChanged });

    expect(api.checked.value).toBe(false);

    api.onRootClick();
    await nextTick();

    expect(api.checked.value).toBe(true);
    expect(onChanged).toHaveBeenCalledWith(true);

    scope.stop();
  });

  it('受控时内部状态不被改写，只回调', async () => {
    const external = ref(false);
    const onChanged = vi.fn();

    const { api, scope } = setup({
      checked: () => external.value,
      onCheckedChange: onChanged,
    });

    api.onRootClick();
    await nextTick();

    expect(onChanged).toHaveBeenCalledWith(true);
    // 父级没应用新值，开关仍显示关闭：这正是受控语义
    expect(api.checked.value).toBe(false);

    external.value = true;
    await nextTick();

    expect(api.checked.value).toBe(true);

    scope.stop();
  });

  it('禁用时点击不改变状态，属性同时给出 disabled 与 data-disabled', async () => {
    const { api, scope } = setup({ disabled: true });

    api.onRootClick();
    await nextTick();

    expect(api.checked.value).toBe(false);

    const props = api.getRootProps();

    expect(props.role).toBe('switch');
    expect(props['aria-checked']).toBe(false);
    expect(props['data-state']).toBe('unchecked');
    expect(props.disabled).toBe(true);
    expect(props['data-disabled']).toBe('');
    // 提交值默认 on，与原生 checkbox 一致
    expect(props.value).toBe('on');

    scope.stop();
  });

  it('required 才输出 aria-required', () => {
    const required = setup({ required: true });
    const plain = setup({});

    expect(required.api.getRootProps()['aria-required']).toBe(true);
    expect(plain.api.getRootProps()['aria-required']).toBeUndefined();

    required.scope.stop();
    plain.scope.stop();
  });
});

describe('bubble input 与表单', () => {
  it('不在表单里且未指定 form 时不渲染 input', async () => {
    const { api, scope } = setup({}, false);

    await nextTick();

    expect(api.isFormControl.value).toBe(false);
    expect(api.getInputProps()).toBeNull();

    scope.stop();
  });

  it('在表单里时给出 input 属性与覆盖按钮的样式', async () => {
    const { api, scope } = setup({ name: 'agree', value: 'yes', required: true });

    await nextTick();

    const props = api.getInputProps();
    const style = props?.style as Record<string, string>;

    expect(props?.type).toBe('checkbox');
    expect(props?.name).toBe('agree');
    expect(props?.value).toBe('yes');
    expect(props?.required).toBe(true);
    expect(props?.['aria-hidden']).toBe('true');
    expect(props?.tabindex).toBe(-1);
    // checked 不在属性表里：它由原生 setter 写入，避免框架的属性补丁把用户刚点下的值改回去
    expect('checked' in (props ?? {})).toBe(false);

    expect(style.position).toBe('absolute');
    expect(style.pointerEvents).toBe('none');
    expect(style.transform).toBe('translateX(-100%)');

    scope.stop();
  });

  it('状态变化写进原生 input 并向表单派发一次 change', async () => {
    const { api, form, input, scope } = setup({ name: 'notify' });

    await nextTick();

    let changes = 0;

    form.addEventListener('change', () => {
      changes += 1;
    });

    api.setChecked(true);
    await nextTick();

    expect(input.checked).toBe(true);
    expect(changes).toBe(1);

    api.setChecked(false);
    await nextTick();

    expect(input.checked).toBe(false);
    expect(changes).toBe(2);

    scope.stop();
  });

  it('初次挂载只同步值，不派发 change', async () => {
    const { input, scope } = setup({ defaultChecked: true, name: 'once' });

    let changes = 0;

    input.addEventListener('change', () => {
      changes += 1;
    });

    await nextTick();

    expect(input.checked).toBe(true);
    expect(changes).toBe(0);

    scope.stop();
  });

  it('实例上的 checked setter 被表单库劫持时，写入走原型且仍然通知', async () => {
    const { api, form, input, scope } = setup({ name: 'shadowed' });

    await nextTick();

    let shadowSetterCalls = 0;
    let changes = 0;

    // 模拟 react-hook-form 一类库在实例上劫持 checked 的写法
    Object.defineProperty(input, 'checked', {
      configurable: true,
      get: () => false,
      set: () => {
        shadowSetterCalls += 1;
      },
    });

    form.addEventListener('change', () => {
      changes += 1;
    });

    api.setChecked(true);
    await nextTick();

    expect(shadowSetterCalls).toBe(0);
    expect(changes).toBe(1);

    scope.stop();
  });

  it('form reset 把状态回到初次出现时的值', async () => {
    const { api, form, scope } = setup({ defaultChecked: true });

    await nextTick();

    api.setChecked(false);
    await nextTick();

    expect(api.checked.value).toBe(false);

    form.reset();
    await nextTick();

    expect(api.checked.value).toBe(true);

    scope.stop();
  });

  it('显式 form id 让表单外的控件也被视为表单控件', async () => {
    const form = document.createElement('form');

    form.id = 'outside';
    document.body.append(form);

    const { api, scope } = setup({ form: 'outside', name: 'flag' }, false);

    await nextTick();

    expect(api.isFormControl.value).toBe(true);
    expect(api.getInputProps()?.form).toBe('outside');

    scope.stop();
  });

  it('按按钮实测尺寸写入样式', async () => {
    const { api, control, scope } = setup({});

    // jsdom 的 getBoundingClientRect 恒为 0，这里用桩数据验证尺寸链路确实写进样式
    control.getBoundingClientRect = () =>
      ({
        width: 42,
        height: 24,
        top: 0,
        left: 0,
        right: 42,
        bottom: 24,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    api.setControl(control);
    await nextTick();

    const style = api.getInputProps()?.style as Record<string, string>;

    expect(style.width).toBe('42px');
    expect(style.height).toBe('24px');

    scope.stop();
  });
});
