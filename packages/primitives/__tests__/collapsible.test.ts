// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  COLLAPSIBLE_HEIGHT_VAR,
  COLLAPSIBLE_WIDTH_VAR,
  getCollapsibleContentAttrs,
  getCollapsibleContentVars,
  getCollapsibleRootAttrs,
  getCollapsibleState,
  getCollapsibleTriggerAttrs,
} from '../src/collapsible';

describe('getCollapsibleState', () => {
  it('词表是 open / closed', () => {
    expect(getCollapsibleState(true)).toBe('open');
    expect(getCollapsibleState(false)).toBe('closed');
  });
});

describe('getCollapsibleRootAttrs', () => {
  it('给出 data-state，禁用时才给 data-disabled', () => {
    expect(getCollapsibleRootAttrs({ open: true })).toEqual({ 'data-state': 'open' });
    expect(getCollapsibleRootAttrs({ open: false, disabled: true })).toEqual({
      'data-state': 'closed',
      'data-disabled': '',
    });
  });
});

describe('getCollapsibleTriggerAttrs', () => {
  it('aria-expanded 始终输出布尔值', () => {
    expect(getCollapsibleTriggerAttrs({ open: false, contentId: 'c' })['aria-expanded']).toBe(
      false
    );
    expect(getCollapsibleTriggerAttrs({ open: true, contentId: 'c' })['aria-expanded']).toBe(true);
  });

  it('aria-controls 只在展开时输出，避免悬空引用', () => {
    expect(getCollapsibleTriggerAttrs({ open: true, contentId: 'c-1' })['aria-controls']).toBe(
      'c-1'
    );
    expect(
      getCollapsibleTriggerAttrs({ open: false, contentId: 'c-1' })['aria-controls']
    ).toBeUndefined();
  });

  it('按钮语义与状态属性齐全', () => {
    const attrs = getCollapsibleTriggerAttrs({ open: true, disabled: true, contentId: 'c' });

    expect(attrs.type).toBe('button');
    expect(attrs['data-state']).toBe('open');
    expect(attrs['data-disabled']).toBe('');
  });
});

describe('getCollapsibleContentAttrs', () => {
  it('hidden 由展开与 Presence 共同决定', () => {
    // 展开：可见
    expect(getCollapsibleContentAttrs({ open: true, isPresent: true, contentId: 'c' }).hidden).toBe(
      undefined
    );
    // 收起但仍在退场动画里：必须可见，否则动画连同一帧被 hidden 掉
    expect(
      getCollapsibleContentAttrs({ open: false, isPresent: true, contentId: 'c' }).hidden
    ).toBe(undefined);
    // 收起且已退场：隐藏
    expect(
      getCollapsibleContentAttrs({ open: false, isPresent: false, contentId: 'c' }).hidden
    ).toBe(true);
  });

  it('带 id 供 Trigger 的 aria-controls 指向', () => {
    expect(getCollapsibleContentAttrs({ open: true, isPresent: true, contentId: 'c-9' }).id).toBe(
      'c-9'
    );
  });
});

describe('getCollapsibleContentVars', () => {
  it('把实测尺寸写成 px 变量', () => {
    expect(getCollapsibleContentVars({ height: 128, width: 640 })).toEqual({
      [COLLAPSIBLE_HEIGHT_VAR]: '128px',
      [COLLAPSIBLE_WIDTH_VAR]: '640px',
    });
  });

  it('未测得或为 0 时不写，避免入场动画终点塌成 0', () => {
    expect(getCollapsibleContentVars(null)).toEqual({});
    expect(getCollapsibleContentVars({ height: 0, width: 0 })).toEqual({});
  });
});
