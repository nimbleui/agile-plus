// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  BUILT_IN_VALIDITY_MESSAGES,
  DEFAULT_INVALID_MESSAGE,
  VALIDITY_FLAGS,
  VALIDITY_MATCHERS,
  concatAriaDescribedby,
  getFieldStateAttrs,
  getFirstInvalidControl,
  getMessageMatch,
  hasBuiltInError,
  isAsyncCustomMatcher,
  readValiditySnapshot,
} from '../src/form/validity';

/** 造一个 ValidityState 形状的普通对象，未列出的键按 false。 */
function validity(flags: Partial<Record<string, boolean>> = {}): Record<string, boolean> {
  const base: Record<string, boolean> = {};

  for (const flag of VALIDITY_FLAGS) base[flag] = false;

  return { ...base, valid: true, ...flags };
}

describe('名单与文案表', () => {
  it('matchers 是 10 个内置状态，快照多一个 customError', () => {
    expect(VALIDITY_MATCHERS).toHaveLength(10);
    expect(VALIDITY_FLAGS).toHaveLength(11);
    expect(VALIDITY_FLAGS).toContain('customError');
    expect(VALIDITY_MATCHERS).not.toContain('customError');
  });

  it('每个会报错的状态都有缺省文案，valid 没有', () => {
    expect(BUILT_IN_VALIDITY_MESSAGES.valueMissing).toBe('This value is missing');
    expect(BUILT_IN_VALIDITY_MESSAGES.typeMismatch).toBe(
      'This value does not match the required type'
    );
    expect(BUILT_IN_VALIDITY_MESSAGES.valid).toBeUndefined();
    expect(BUILT_IN_VALIDITY_MESSAGES.badInput).toBe(DEFAULT_INVALID_MESSAGE);
  });
});

describe('readValiditySnapshot', () => {
  it('全部键都摊平成布尔值，非布尔按 false', () => {
    const snapshot = readValiditySnapshot(
      validity({ valueMissing: true, valid: false, customError: 'yes' as unknown as boolean })
    );

    expect(snapshot.valueMissing).toBe(true);
    expect(snapshot.valid).toBe(false);
    expect(snapshot.customError).toBe(false);
    expect(Object.keys(snapshot)).toHaveLength(11);
  });
});

describe('hasBuiltInError', () => {
  it('valid 与 customError 不算内置错误', () => {
    expect(hasBuiltInError(readValiditySnapshot(validity()))).toBe(false);
    expect(hasBuiltInError(readValiditySnapshot(validity({ customError: true })))).toBe(false);
    expect(hasBuiltInError(readValiditySnapshot(validity({ patternMismatch: true })))).toBe(true);
  });
});

describe('getFieldStateAttrs', () => {
  it('未校验过时两个属性都不输出', () => {
    expect(getFieldStateAttrs({})).toEqual({});
    expect(getFieldStateAttrs({ validity: undefined, serverInvalid: false })).toEqual({});
  });

  it('合法时只给 data-valid，非法时只给 data-invalid', () => {
    expect(getFieldStateAttrs({ validity: readValiditySnapshot(validity()) })).toEqual({
      'data-valid': '',
    });
    expect(
      getFieldStateAttrs({ validity: readValiditySnapshot(validity({ valid: false })) })
    ).toEqual({ 'data-invalid': '' });
  });

  it('服务端错误压过原生的 valid', () => {
    expect(
      getFieldStateAttrs({ validity: readValiditySnapshot(validity()), serverInvalid: true })
    ).toEqual({ 'data-invalid': '' });
  });
});

describe('concatAriaDescribedby', () => {
  it('按顺序去重合并，全空时不输出', () => {
    expect(concatAriaDescribedby('label-1', 'err-a err-b')).toBe('label-1 err-a err-b');
    expect(concatAriaDescribedby('err-a', 'err-a  err-b')).toBe('err-a err-b');
    expect(concatAriaDescribedby(undefined, '', '  ')).toBeUndefined();
    expect(concatAriaDescribedby(undefined, 'err-a')).toBe('err-a');
  });
});

describe('getFirstInvalidControl', () => {
  it('原生 validity 与 aria-invalid 都算无效', () => {
    const ok = { validity: { valid: true }, getAttribute: () => null };
    const nativeInvalid = { validity: { valid: false }, getAttribute: () => null };
    const ariaInvalid = {
      getAttribute: (name: string) => (name === 'aria-invalid' ? 'true' : null),
    };

    expect(getFirstInvalidControl([ok, nativeInvalid, ariaInvalid])).toBe(nativeInvalid);
    expect(getFirstInvalidControl([ok, ariaInvalid])).toBe(ariaInvalid);
    expect(getFirstInvalidControl([ok])).toBeNull();
  });
});

describe('getMessageMatch', () => {
  const validSnapshot = readValiditySnapshot(validity());
  const missingSnapshot = readValiditySnapshot(validity({ valid: false, valueMissing: true }));
  const customSnapshot = readValiditySnapshot(validity({ valid: false, customError: true }));

  it('forceMatch 无条件命中，用于进出场动画', () => {
    expect(getMessageMatch({ match: 'valueMissing', forceMatch: true })).toBe(true);
    expect(getMessageMatch({ match: 'valueMissing' })).toBe(false);
  });

  it('不传 match 时始终显示（服务端错误文案）', () => {
    expect(getMessageMatch({})).toBe(true);
  });

  it('字符串 match 读快照对应键', () => {
    expect(getMessageMatch({ match: 'valueMissing', validity: missingSnapshot })).toBe(true);
    expect(getMessageMatch({ match: 'valueMissing', validity: validSnapshot })).toBe(false);
    expect(getMessageMatch({ match: 'valid', validity: validSnapshot })).toBe(true);
  });

  it('函数 match 只在没有内置错误时参与', () => {
    const match = (): boolean => true;

    expect(
      getMessageMatch({
        match,
        validity: customSnapshot,
        customErrors: { 'm-1': true },
        messageId: 'm-1',
      })
    ).toBe(true);

    // 已经有内置错误：让位给那条文案。
    expect(
      getMessageMatch({
        match,
        validity: missingSnapshot,
        customErrors: { 'm-1': true },
        messageId: 'm-1',
      })
    ).toBe(false);

    expect(
      getMessageMatch({
        match,
        validity: customSnapshot,
        customErrors: { 'm-1': false },
        messageId: 'm-1',
      })
    ).toBe(false);
  });
});

describe('isAsyncCustomMatcher', () => {
  it('只认 async 声明，不试跑函数', () => {
    expect(isAsyncCustomMatcher(() => true)).toBe(false);
    expect(isAsyncCustomMatcher(async () => true)).toBe(true);
  });
});
