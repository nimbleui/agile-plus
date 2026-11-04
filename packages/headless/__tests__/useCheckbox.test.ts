import { nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountFormControl } from './helpers/form-control';

import { useCheckbox } from '../src/useCheckbox';

import type { UseCheckboxOptions } from '../src/useCheckbox';

/**
 * 挂到真实表单树上跑 useCheckbox，元素交给 setControl / setInputElement。
 *
 * DOM 结构与 scope 生命周期由 helpers/form-control 提供，与 useSwitch 走同一份夹具。
 */
function setup(options: UseCheckboxOptions = {}, inForm = true) {
  const fixture = mountFormControl(() => useCheckbox(options), inForm);

  fixture.api.setControl(fixture.control);
  fixture.api.setInputElement(fixture.input);

  return fixture;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('状态与属性', () => {
  it('点击在半选时明确化为选中，而不是取消', async () => {
    const { api, scope } = setup({ defaultChecked: 'indeterminate' });

    expect(api.checked.value).toBe('indeterminate');

    api.onRootClick();
    await nextTick();

    expect(api.checked.value).toBe(true);

    scope.stop();
  });

  it('属性表给出三态词表与 required', () => {
    const { api, scope } = setup({ defaultChecked: 'indeterminate', required: true });

    const props = api.getRootProps();

    expect(props.role).toBe('checkbox');
    expect(props['aria-checked']).toBe('mixed');
    expect(props['data-state']).toBe('indeterminate');
    expect(props['aria-required']).toBe('true');

    scope.stop();
  });
});

describe('bubble input 与表单', () => {
  it('控件不在表单内时不渲染 input', async () => {
    const { api, scope } = setup({ name: 'agree' }, false);

    await nextTick();

    expect(api.isFormControl.value).toBe(false);
    expect(api.getInputProps()).toBeNull();

    scope.stop();
  });

  it('在表单内时给出属性表，且 checked 不是 attribute', async () => {
    const { api, scope } = setup({ name: 'agree', value: 'yes', required: true });

    await nextTick();

    const props = api.getInputProps();

    expect(props?.type).toBe('checkbox');
    expect(props?.name).toBe('agree');
    expect(props?.value).toBe('yes');
    expect(props?.required).toBe(true);
    expect(props?.tabindex).toBe(-1);
    expect('checked' in (props ?? {})).toBe(false);

    const style = props?.style as Record<string, string>;

    expect(style.position).toBe('absolute');
    expect(style.transform).toBe('translateX(-100%)');
    expect(style.pointerEvents).toBe('none');

    scope.stop();
  });

  it('提交值随勾选出现与消失，未提供 value 时用默认的 on', async () => {
    const { api, form, input, scope } = setup({ name: 'agree' });

    // 模板没渲染，属性表里的 name 要手动落到元素上，FormData 才认这个字段。
    input.name = 'agree';

    await nextTick();

    expect(new FormData(form).get('agree')).toBeNull();

    api.setChecked(true);
    await nextTick();

    expect(new FormData(form).get('agree')).toBe('on');

    api.setChecked(false);
    await nextTick();

    expect(new FormData(form).get('agree')).toBeNull();

    scope.stop();
  });

  it('半选写进原生控件是未勾选，而不是选中', async () => {
    const { api, input, scope } = setup({ defaultChecked: 'indeterminate', name: 'mixed' });

    await nextTick();

    expect(input.checked).toBe(false);

    scope.stop();
  });

  it('状态变化只派发一次 change，初次挂载不派发', async () => {
    const changes = vi.fn();

    const { api, form, scope } = setup({ defaultChecked: true, name: 'notify' });

    form.addEventListener('change', changes);

    await nextTick();

    expect(changes).not.toHaveBeenCalled();

    api.setChecked(false);
    await nextTick();

    expect(changes).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('form reset 回到初次出现时的状态', async () => {
    const { api, form, input, scope } = setup({ defaultChecked: true, name: 'reset' });

    await nextTick();

    api.setChecked(false);
    await nextTick();

    expect(input.checked).toBe(false);

    form.reset();
    await nextTick();

    expect(api.checked.value).toBe(true);
    expect(input.checked).toBe(true);

    scope.stop();
  });
});
