import { describe, expect, it } from 'vitest';

import {
  getAccordionItemAttrs,
  getAccordionRootAttrs,
  isAccordionItemOpen,
  normalizeAccordionValue,
  resolveAccordionValue,
  serializeAccordionValue,
} from '../src/accordion';

describe('normalizeAccordionValue', () => {
  it('single 把字符串包成数组，空串与 null/undefined 视为未展开', () => {
    expect(normalizeAccordionValue('single', 'a')).toEqual(['a']);
    expect(normalizeAccordionValue('single', '')).toEqual([]);
    expect(normalizeAccordionValue('single', null)).toEqual([]);
    expect(normalizeAccordionValue('single', undefined)).toEqual([]);
  });

  it('multiple 保留数组，非数组与空值归一为空集合', () => {
    expect(normalizeAccordionValue('multiple', ['a', 'b'])).toEqual(['a', 'b']);
    expect(normalizeAccordionValue('multiple', 'a')).toEqual([]);
    expect(normalizeAccordionValue('multiple', null)).toEqual([]);
    expect(normalizeAccordionValue('multiple', undefined)).toEqual([]);
  });
});

describe('serializeAccordionValue', () => {
  it('single 取首项，空集合序列化成空串而不是 undefined', () => {
    expect(serializeAccordionValue('single', ['a'])).toBe('a');
    expect(serializeAccordionValue('single', [])).toBe('');
  });

  it('multiple 原样返回数组', () => {
    expect(serializeAccordionValue('multiple', ['a', 'b'])).toEqual(['a', 'b']);
    expect(serializeAccordionValue('multiple', [])).toEqual([]);
  });
});

describe('isAccordionItemOpen', () => {
  it('值集合包含该项即展开', () => {
    expect(isAccordionItemOpen(['a', 'b'], 'a')).toBe(true);
    expect(isAccordionItemOpen(['a', 'b'], 'c')).toBe(false);
    expect(isAccordionItemOpen([], 'a')).toBe(false);
  });
});

describe('resolveAccordionValue', () => {
  it('single 展开替换整个值', () => {
    expect(
      resolveAccordionValue({ type: 'single', collapsible: false, value: ['a'], itemValue: 'b', open: true })
    ).toEqual(['b']);
  });

  it('single 收起：collapsible 允许则清空，不允许则保持原值', () => {
    expect(
      resolveAccordionValue({ type: 'single', collapsible: true, value: ['a'], itemValue: 'a', open: false })
    ).toEqual([]);
    expect(
      resolveAccordionValue({ type: 'single', collapsible: false, value: ['a'], itemValue: 'a', open: false })
    ).toEqual(['a']);
  });

  it('multiple 展开追加、收起移除', () => {
    expect(
      resolveAccordionValue({ type: 'multiple', collapsible: false, value: ['a'], itemValue: 'b', open: true })
    ).toEqual(['a', 'b']);
    expect(
      resolveAccordionValue({ type: 'multiple', collapsible: false, value: ['a', 'b'], itemValue: 'a', open: false })
    ).toEqual(['b']);
  });

  it('multiple 忽略 collapsible 闸门', () => {
    expect(
      resolveAccordionValue({ type: 'multiple', collapsible: true, value: ['a'], itemValue: 'a', open: false })
    ).toEqual([]);
  });
});

describe('getAccordionRootAttrs', () => {
  it('禁用输出空串 data-disabled，未禁用不输出', () => {
    expect(getAccordionRootAttrs({ disabled: true })['data-disabled']).toBe('');
    expect(getAccordionRootAttrs({ disabled: false })['data-disabled']).toBeUndefined();
    expect(getAccordionRootAttrs({})['data-disabled']).toBeUndefined();
  });
});

describe('getAccordionItemAttrs', () => {
  it('data-state 跟随展开，禁用输出空串', () => {
    expect(getAccordionItemAttrs({ open: true })).toMatchObject({ 'data-state': 'open' });
    expect(getAccordionItemAttrs({ open: false })).toMatchObject({ 'data-state': 'closed' });
    expect(getAccordionItemAttrs({ open: false, disabled: true })['data-disabled']).toBe('');
    expect(getAccordionItemAttrs({ open: false, disabled: false })['data-disabled']).toBeUndefined();
  });
});