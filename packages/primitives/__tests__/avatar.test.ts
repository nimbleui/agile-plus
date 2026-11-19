import { describe, expect, it } from 'vitest';

import {
  getAvatarImageAttrs,
  getAvatarInitials,
  getAvatarRootAttrs,
  resolveAvatarFallback,
} from '../src/avatar';

describe('getAvatarInitials', () => {
  it('多词取前两个词的首字符并转大写', () => {
    expect(getAvatarInitials('John Doe')).toBe('JD');
    expect(getAvatarInitials('john doe')).toBe('JD');
    expect(getAvatarInitials('a b c')).toBe('AB');
  });

  it('单词只取首字符', () => {
    expect(getAvatarInitials('John')).toBe('J');
    expect(getAvatarInitials('张三')).toBe('张');
  });

  it('修剪多余空白，空名字返回空串', () => {
    expect(getAvatarInitials('  John   Doe  ')).toBe('JD');
    expect(getAvatarInitials('')).toBe('');
    expect(getAvatarInitials('   ')).toBe('');
  });

  it('max 控制取词数量，<=0 返回空串', () => {
    expect(getAvatarInitials('John Doe', 1)).toBe('J');
    expect(getAvatarInitials('John Doe', 0)).toBe('');
    expect(getAvatarInitials('John Doe', -1)).toBe('');
  });

  it('按码点取首字符，不拆散 emoji 代理对', () => {
    expect(getAvatarInitials('👍 Hi')).toBe('👍H');
  });
});

describe('getAvatarRootAttrs', () => {
  it('把加载状态写成 data-status', () => {
    expect(getAvatarRootAttrs({ status: 'idle' })['data-status']).toBe('idle');
    expect(getAvatarRootAttrs({ status: 'loaded' })['data-status']).toBe('loaded');
    expect(getAvatarRootAttrs({ status: 'error' })['data-status']).toBe('error');
  });
});

describe('getAvatarImageAttrs', () => {
  it('映射 src 与 alt', () => {
    expect(getAvatarImageAttrs({ src: '/a.png', alt: '头像' })).toEqual({ src: '/a.png', alt: '头像' });
    expect(getAvatarImageAttrs({})).toEqual({ src: undefined, alt: undefined });
  });
});

describe('resolveAvatarFallback', () => {
  it('图片已加载则不渲染 fallback', () => {
    expect(resolveAvatarFallback({ status: 'loaded', delayMs: 0, delayElapsed: false })).toBe(false);
    expect(resolveAvatarFallback({ status: 'loaded', delayMs: 500, delayElapsed: true })).toBe(false);
  });

  it('加载失败立即渲染，不被延迟掩盖', () => {
    expect(resolveAvatarFallback({ status: 'error', delayMs: 500, delayElapsed: false })).toBe(true);
  });

  it('idle/loading 在不延迟或延迟到点时渲染', () => {
    expect(resolveAvatarFallback({ status: 'idle', delayMs: 0, delayElapsed: false })).toBe(true);
    expect(resolveAvatarFallback({ status: 'loading', delayMs: 500, delayElapsed: false })).toBe(false);
    expect(resolveAvatarFallback({ status: 'loading', delayMs: 500, delayElapsed: true })).toBe(true);
  });
});