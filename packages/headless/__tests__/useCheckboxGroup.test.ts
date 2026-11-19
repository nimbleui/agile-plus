import { effectScope, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCheckboxGroup } from '../src/useCheckboxGroup';

import type { EffectScope } from 'vue';

import type { UseCheckboxGroupOptions } from '../src/useCheckboxGroup';

const scopes: EffectScope[] = [];

/**
 * 在独立 effect scope 里创建 composable。
 *
 * 这个模块不碰 DOM：组只维护一个值数组，勾选状态是派生结果，没有注册表也没有焦点管理，
 * 因此不需要真实元素，也不需要组件实例。
 */
function setup(options: UseCheckboxGroupOptions = {}) {
  const scope = effectScope();

  scopes.push(scope);

  const api = scope.run(() => useCheckboxGroup(options));

  if (!api) throw new Error('useCheckboxGroup 未在 effect scope 内创建');

  return api;
}

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
});

describe('useCheckboxGroup 非受控值', () => {
  it('缺省是空数组', () => {
    expect(setup().values.value).toEqual([]);
  });

  it('defaultValue 作为初始选中集合', () => {
    expect(setup({ defaultValue: ['a', 'b'] }).values.value).toEqual(['a', 'b']);
  });

  it('拷贝 defaultValue：外部改写传入的数组不穿透进内部状态', () => {
    const external = ['a'];
    const api = setup({ defaultValue: external });

    external.push('b');

    expect(api.values.value).toEqual(['a']);
  });

  it('setItemChecked 勾选时追加、取消时移除', () => {
    const api = setup();

    api.setItemChecked('a', true);
    api.setItemChecked('b', true);

    expect(api.values.value).toEqual(['a', 'b']);

    api.setItemChecked('a', false);

    expect(api.values.value).toEqual(['b']);
  });

  it('半选对组内项目按未勾选处理（与 primitives 同一语义）', () => {
    const api = setup({ defaultValue: ['a'] });

    api.setItemChecked('a', 'indeterminate');

    expect(api.values.value).toEqual([]);
  });

  it('重复勾选与取消不存在的值都不改变内容', () => {
    const api = setup({ defaultValue: ['a'] });

    api.setItemChecked('a', true);
    api.setItemChecked('ghost', false);

    expect(api.values.value).toEqual(['a']);
  });

  it('isValueChecked 是「值在集合里」的派生结果', () => {
    const api = setup({ defaultValue: ['a'] });

    expect(api.isValueChecked('a')).toBe(true);
    expect(api.isValueChecked('b')).toBe(false);

    api.setItemChecked('b', true);

    expect(api.isValueChecked('b')).toBe(true);
  });

  it('setValues 整体替换而不是合并', () => {
    const api = setup({ defaultValue: ['a', 'b'] });

    api.setValues(['c']);

    expect(api.values.value).toEqual(['c']);
  });

  it('每次变化都上报新数组', () => {
    const onValueChange = vi.fn();
    const api = setup({ onValueChange });

    api.setItemChecked('a', true);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(['a']);
  });
});

describe('useCheckboxGroup 受控值', () => {
  it('modelValue 决定选中集合，写入只上报不改内部', () => {
    const onValueChange = vi.fn();
    const modelValue = ref(['a']);
    const api = setup({ modelValue, onValueChange });

    expect(api.values.value).toEqual(['a']);

    api.setItemChecked('b', true);

    expect(onValueChange).toHaveBeenCalledWith(['a', 'b']);
    expect(api.values.value).toEqual(['a']);

    modelValue.value = ['a', 'b'];

    expect(api.values.value).toEqual(['a', 'b']);
    expect(api.isValueChecked('b')).toBe(true);
  });

  it('modelValue 支持 getter 形式', () => {
    const selected = ref(['x']);
    const api = setup({ modelValue: () => selected.value });

    expect(api.values.value).toEqual(['x']);

    selected.value = ['y'];

    expect(api.values.value).toEqual(['y']);
  });
});

describe('useCheckboxGroup 属性表', () => {
  it('缺省时只输出 role，不留永不变的噪声属性', () => {
    expect(setup().getRootProps()).toEqual({
      role: 'group',
      'aria-labelledby': undefined,
      'aria-describedby': undefined,
      'aria-required': undefined,
      'aria-disabled': undefined,
      'data-disabled': undefined,
    });
  });

  it('required 与 disabled 打开后输出对应标记', () => {
    const props = setup({ required: true, disabled: true }).getRootProps();

    expect(props['aria-required']).toBe('true');
    expect(props['aria-disabled']).toBe(true);
    expect(props['data-disabled']).toBe(true);
  });

  it('aria-labelledby / describedby 原样下发', () => {
    const props = setup({ ariaLabelledby: 'legend-id', ariaDescribedby: 'hint-id' }).getRootProps();

    expect(props['aria-labelledby']).toBe('legend-id');
    expect(props['aria-describedby']).toBe('hint-id');
  });

  it('disabled 与 required 支持 getter，且随来源响应式变化', () => {
    const disabled = ref(false);
    const api = setup({ disabled: () => disabled.value, required: () => !disabled.value });

    expect(api.isDisabled.value).toBe(false);
    expect(api.getRootProps()['aria-required']).toBe('true');

    disabled.value = true;

    expect(api.isDisabled.value).toBe(true);
    expect(api.getRootProps()['aria-required']).toBeUndefined();
    expect(api.getRootProps()['data-disabled']).toBe(true);
  });

  it('name 由组下发，供各项目的隐藏 input 共用', () => {
    const name = ref('picked');
    const api = setup({ name: () => name.value });

    expect(api.name.value).toBe('picked');

    name.value = 'other';

    expect(api.name.value).toBe('other');
  });
});