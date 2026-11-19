import { describe, expect, it } from 'vitest';

import { getInputAttrs } from '../src/input';

describe('getInputAttrs', () => {
  it('默认状态不输出任何属性，避免 [data-disabled] 命中所有输入框', () => {
    const attrs = getInputAttrs({ disabled: false, readOnly: false, required: false });

    expect(attrs['data-disabled']).toBeUndefined();
    expect(attrs['data-readonly']).toBeUndefined();
    expect(attrs['aria-required']).toBeUndefined();
  });

  it('禁用与只读输出空串属性，必填输出 aria-required', () => {
    const attrs = getInputAttrs({ disabled: true, readOnly: true, required: true });

    expect(attrs['data-disabled']).toBe('');
    expect(attrs['data-readonly']).toBe('');
    expect(attrs['aria-required']).toBe(true);
  });

  it('三个状态互相独立', () => {
    const attrs = getInputAttrs({ disabled: false, readOnly: true, required: false });

    expect(attrs['data-disabled']).toBeUndefined();
    expect(attrs['data-readonly']).toBe('');
    expect(attrs['aria-required']).toBeUndefined();
  });
});