// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { getSwitchAttrs, getSwitchDataState } from '../src/switch';

describe('getSwitchDataState', () => {
  it('词表是 checked / unchecked', () => {
    expect(getSwitchDataState(true)).toBe('checked');
    expect(getSwitchDataState(false)).toBe('unchecked');
  });
});

describe('getSwitchAttrs', () => {
  it('role 是 switch 且 aria-checked 始终输出布尔值', () => {
    const attrs = getSwitchAttrs({ checked: true, disabled: false, required: false });

    expect(attrs.role).toBe('switch');
    expect(attrs['aria-checked']).toBe(true);
    expect(attrs['data-state']).toBe('checked');

    expect(
      getSwitchAttrs({ checked: false, disabled: false, required: false })['aria-checked']
    ).toBe(false);
  });

  it('未启用 required 与 disabled 时不输出对应属性', () => {
    const attrs = getSwitchAttrs({ checked: false, disabled: false, required: false });

    expect('aria-required' in attrs).toBe(true);
    expect(attrs['aria-required']).toBeUndefined();
    expect(attrs['data-disabled']).toBeUndefined();
  });

  it('启用时给出 aria-required 与空的 data-disabled', () => {
    const attrs = getSwitchAttrs({ checked: true, disabled: true, required: true });

    expect(attrs['aria-required']).toBe(true);
    expect(attrs['data-disabled']).toBe('');
    expect(attrs['data-state']).toBe('checked');
  });
});
