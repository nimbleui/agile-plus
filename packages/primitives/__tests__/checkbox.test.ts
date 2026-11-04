// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  getCheckboxAttrs,
  isCheckboxIndicatorPresent,
  isGroupValueChecked,
  resolveIndeterminate,
  resolveNextChecked,
  toggleGroupValue,
} from '../src/checkbox';

describe('getCheckboxAttrs', () => {
  it('三态各自映射到对应的 aria-checked 与 data-state', () => {
    expect(getCheckboxAttrs({ checked: true })).toEqual({
      'aria-checked': 'true',
      'data-state': 'checked',
    });

    expect(getCheckboxAttrs({ checked: false })).toEqual({
      'aria-checked': 'false',
      'data-state': 'unchecked',
    });

    expect(getCheckboxAttrs({ checked: 'indeterminate' })).toEqual({
      'aria-checked': 'mixed',
      'data-state': 'indeterminate',
    });
  });

  it('未提供的布尔字段不产出属性，避免留下永不变的噪声属性', () => {
    expect(getCheckboxAttrs({ checked: false, disabled: false })).toEqual({
      'aria-checked': 'false',
      'data-state': 'unchecked',
    });

    expect(getCheckboxAttrs({ checked: false, required: false })).toEqual({
      'aria-checked': 'false',
      'data-state': 'unchecked',
    });
  });

  it('disabled 产出存在性属性，required 产出 aria-required', () => {
    expect(getCheckboxAttrs({ checked: true, disabled: true })).toEqual({
      'aria-checked': 'true',
      'data-state': 'checked',
      'data-disabled': '',
    });

    expect(getCheckboxAttrs({ checked: true, required: true })).toEqual({
      'aria-checked': 'true',
      'data-state': 'checked',
      'aria-required': 'true',
    });
  });

  it('禁用与必选可以同时出现', () => {
    expect(getCheckboxAttrs({ checked: 'indeterminate', disabled: true, required: true })).toEqual({
      'aria-checked': 'mixed',
      'data-state': 'indeterminate',
      'aria-required': 'true',
      'data-disabled': '',
    });
  });
});

describe('resolveNextChecked', () => {
  it('半选点击后收敛为选中，而不是取消', () => {
    expect(resolveNextChecked('indeterminate')).toBe(true);
  });

  it('选中与未选中互为翻转', () => {
    expect(resolveNextChecked(true)).toBe(false);
    expect(resolveNextChecked(false)).toBe(true);
  });
});

describe('isCheckboxIndicatorPresent', () => {
  it('选中与半选都挂载 Indicator，未选中不挂载', () => {
    expect(isCheckboxIndicatorPresent(true)).toBe(true);
    expect(isCheckboxIndicatorPresent('indeterminate')).toBe(true);
    expect(isCheckboxIndicatorPresent(false)).toBe(false);
  });
});

describe('toggleGroupValue', () => {
  it('勾选时追加值，取消时移除值', () => {
    expect(toggleGroupValue(['a'], 'b', true)).toEqual(['a', 'b']);
    expect(toggleGroupValue(['a', 'b'], 'a', false)).toEqual(['b']);
  });

  it('重复勾选与取消不存在的值都不改变集合', () => {
    expect(toggleGroupValue(['a'], 'a', true)).toEqual(['a']);
    expect(toggleGroupValue(['a'], 'b', false)).toEqual(['a']);
  });

  it('半选按未勾选处理，不会把项追加进集合', () => {
    expect(toggleGroupValue(['a'], 'b', 'indeterminate')).toEqual(['a']);
  });

  it('返回新数组而不修改入参', () => {
    const source = ['a'];
    const next = toggleGroupValue(source, 'b', true);

    expect(source).toEqual(['a']);
    expect(next).not.toBe(source);
  });
});

describe('isGroupValueChecked', () => {
  it('仅存在于集合中才为 true', () => {
    expect(isGroupValueChecked(['a', 'b'], 'a')).toBe(true);
    expect(isGroupValueChecked(['a', 'b'], 'c')).toBe(false);
    expect(isGroupValueChecked([], 'a')).toBe(false);
  });
});

describe('resolveIndeterminate', () => {
  it('全不选与全选中分别落到两端状态', () => {
    expect(resolveIndeterminate(0, 3)).toBe(false);
    expect(resolveIndeterminate(3, 3)).toBe(true);
  });

  it('部分选中为半选', () => {
    expect(resolveIndeterminate(1, 3)).toBe('indeterminate');
    expect(resolveIndeterminate(2, 3)).toBe('indeterminate');
  });

  it('没有子项时返回未选中，避免空集合被误报为全选', () => {
    expect(resolveIndeterminate(0, 0)).toBe(false);
  });
});
