// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import {
  PROGRESS_DEFAULT_MAX,
  PROGRESS_VALUE_VAR,
  defaultGetValueLabel,
  getProgressDataAttrs,
  getProgressIndicatorAttrs,
  getProgressRatio,
  getProgressRootAttrs,
  getProgressState,
  getProgressVars,
  resolveProgressMax,
  toProgressNumber,
} from '../src/progress';

describe('toProgressNumber', () => {
  it('只接受有限数，其余都算不确定进度', () => {
    expect(toProgressNumber(42)).toBe(42);
    expect(toProgressNumber(0)).toBe(0);
    expect(toProgressNumber(-5)).toBe(-5);
    expect(toProgressNumber(null)).toBeNull();
    expect(toProgressNumber(undefined)).toBeNull();
    expect(toProgressNumber(Number.NaN)).toBeNull();
    expect(toProgressNumber(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('resolveProgressMax', () => {
  it('非正的 max 回退到默认值', () => {
    expect(resolveProgressMax(500)).toBe(500);
    expect(resolveProgressMax(0.5)).toBe(0.5);
    expect(resolveProgressMax(undefined)).toBe(PROGRESS_DEFAULT_MAX);
    expect(resolveProgressMax(0)).toBe(PROGRESS_DEFAULT_MAX);
    expect(resolveProgressMax(-100)).toBe(PROGRESS_DEFAULT_MAX);
    expect(resolveProgressMax(Number.NaN)).toBe(PROGRESS_DEFAULT_MAX);
    expect(resolveProgressMax(Number.POSITIVE_INFINITY)).toBe(PROGRESS_DEFAULT_MAX);
  });
});

describe('getProgressRatio', () => {
  it('比例两端夹取到 0 与 1', () => {
    expect(getProgressRatio(25, 50)).toBe(0.5);
    expect(getProgressRatio(-10, 100)).toBe(0);
    expect(getProgressRatio(150, 100)).toBe(1);
    expect(getProgressRatio(0, 100)).toBe(0);
  });

  it('不确定进度不产生比例', () => {
    expect(getProgressRatio(null, 100)).toBeNull();
    expect(getProgressRatio(undefined, 100)).toBeNull();
    expect(getProgressRatio(Number.NaN, 100)).toBeNull();
  });

  it('非法 max 先回退再参与除法', () => {
    expect(getProgressRatio(50, 0)).toBe(0.5);
  });
});

describe('getProgressState', () => {
  it('词表是 loading / complete / indeterminate', () => {
    expect(getProgressState(42, 100)).toBe('loading');
    expect(getProgressState(0, 100)).toBe('loading');
    expect(getProgressState(100, 100)).toBe('complete');
    expect(getProgressState(null, 100)).toBe('indeterminate');
    expect(getProgressState(Number.NaN, 100)).toBe('indeterminate');
  });

  it('超出上限也判为 complete，而不是停在 loading', () => {
    // Radix 用 === 判定，轨道已画满而状态还在 loading，样式层会停在动画上。
    expect(getProgressState(120, 100)).toBe('complete');
  });
});

describe('defaultGetValueLabel', () => {
  it('按取整百分比播报', () => {
    expect(defaultGetValueLabel(42, 100)).toBe('42%');
    expect(defaultGetValueLabel(1, 3)).toBe('33%');
    expect(defaultGetValueLabel(2, 3)).toBe('67%');
  });

  it('超出上限播报 100%，而不是 150%', () => {
    expect(defaultGetValueLabel(150, 100)).toBe('100%');
  });
});

describe('getProgressRootAttrs', () => {
  it('进度存在时给出完整 ARIA 与 data-*', () => {
    const attrs = getProgressRootAttrs({ value: 42, max: 100 });

    expect(attrs).toMatchObject({
      role: 'progressbar',
      'aria-valuemin': 0,
      'aria-valuenow': 42,
      'aria-valuemax': 100,
      'aria-valuetext': '42%',
      'data-state': 'loading',
      'data-value': 42,
      'data-max': 100,
    });
  });

  it('不确定进度不输出 valuenow 与 valuetext，也不输出 data-value', () => {
    const attrs = getProgressRootAttrs({ value: null, max: 100 });

    expect(attrs['aria-valuenow']).toBeUndefined();
    expect(attrs['aria-valuetext']).toBeUndefined();
    expect(attrs['data-value']).toBeUndefined();
    expect(attrs['data-state']).toBe('indeterminate');
    // 下限与上限仍然要有，否则读屏无法知道这根进度条的量程。
    expect(attrs['aria-valuemin']).toBe(0);
    expect(attrs['aria-valuemax']).toBe(100);
  });

  it('非法 max 参与 ARIA 输出前先回退', () => {
    const attrs = getProgressRootAttrs({ value: 50 });

    expect(attrs['aria-valuemax']).toBe(PROGRESS_DEFAULT_MAX);
    expect(attrs['data-max']).toBe(PROGRESS_DEFAULT_MAX);
    expect(attrs['aria-valuetext']).toBe('50%');
  });

  it('自定义 getValueLabel 收到收口后的值与上限', () => {
    const getValueLabel = vi.fn((value: number, max: number) => `${value} / ${max} 步`);

    const attrs = getProgressRootAttrs({ value: 3, max: 8, getValueLabel });

    expect(getValueLabel).toHaveBeenCalledWith(3, 8);
    expect(attrs['aria-valuetext']).toBe('3 / 8 步');
  });
});

describe('getProgressIndicatorAttrs', () => {
  it('只带状态属性，不重复播报', () => {
    const attrs = getProgressIndicatorAttrs({ value: 42, max: 100 });

    expect(attrs).toEqual({ 'data-state': 'loading', 'data-value': 42, 'data-max': 100 });
  });

  it('与 Root 的状态三件套完全一致', () => {
    const config = { value: 100, max: 100 };

    expect(getProgressIndicatorAttrs(config)).toEqual(getProgressDataAttrs(config));
  });
});

describe('getProgressVars', () => {
  it('把无单位比例写进自定义属性，宽度换算留给样式层', () => {
    expect(getProgressVars({ value: 42, max: 100 })).toEqual({ [PROGRESS_VALUE_VAR]: '0.42' });
    expect(getProgressVars({ value: 100, max: 100 })).toEqual({ [PROGRESS_VALUE_VAR]: '1' });
    expect(getProgressVars({ value: -10, max: 100 })).toEqual({ [PROGRESS_VALUE_VAR]: '0' });
  });

  it('不确定进度返回空对象，由样式的 [data-state] 给出宽度', () => {
    expect(getProgressVars({ value: null, max: 100 })).toEqual({});
  });
});
