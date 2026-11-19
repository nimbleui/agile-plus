import { describe, expect, it } from 'vitest';

import { getButtonAttrs } from '../src/button';

describe('getButtonAttrs', () => {
  it('默认状态不输出任何属性', () => {
    const attrs = getButtonAttrs({ disabled: false, loading: false });

    expect(attrs['data-disabled']).toBeUndefined();
    expect(attrs['data-loading']).toBeUndefined();
    expect(attrs['aria-busy']).toBeUndefined();
  });

  it('禁用输出 data-disabled，加载输出 data-loading 与 aria-busy', () => {
    const disabled = getButtonAttrs({ disabled: true, loading: false });
    const loading = getButtonAttrs({ disabled: false, loading: true });

    expect(disabled['data-disabled']).toBe('');
    expect(disabled['data-loading']).toBeUndefined();
    expect(loading['data-loading']).toBe('');
    expect(loading['aria-busy']).toBe(true);
  });

  it('加载合并进禁用时两个钩子同时存在', () => {
    const attrs = getButtonAttrs({ disabled: true, loading: true });

    expect(attrs['data-disabled']).toBe('');
    expect(attrs['data-loading']).toBe('');
    expect(attrs['aria-busy']).toBe(true);
  });
});