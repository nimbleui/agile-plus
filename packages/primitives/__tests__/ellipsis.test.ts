// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ELLIPSIS_LINES,
  DEFAULT_ELLIPSIS_TAIL,
  getEllipsisClampStyle,
  getEllipsisDataState,
  getEllipsisTailStyle,
  getEllipsisWrapperStyle,
  resolveEllipsisLines,
  resolveEllipsisOverflow,
  splitMiddleEllipsis,
} from '../src/ellipsis';

describe('resolveEllipsisLines', () => {
  it('single 与 middle 恒为 1 行，传入 lines 不改变行为', () => {
    expect(resolveEllipsisLines('single', 5)).toBe(1);
    expect(resolveEllipsisLines('middle', 5)).toBe(1);
  });

  it('multi 缺省 2 行，取不小于 1 的整数', () => {
    expect(resolveEllipsisLines('multi')).toBe(DEFAULT_ELLIPSIS_LINES);
    expect(resolveEllipsisLines('multi', 3)).toBe(3);
    expect(resolveEllipsisLines('multi', 2.9)).toBe(2);
    expect(resolveEllipsisLines('multi', 0)).toBe(1);
    expect(resolveEllipsisLines('multi', -3)).toBe(1);
  });

  it('非法行数回落到缺省，避免 line-clamp 拿到 NaN 后整段消失', () => {
    expect(resolveEllipsisLines('multi', Number.NaN)).toBe(DEFAULT_ELLIPSIS_LINES);
    expect(resolveEllipsisLines('multi', Number.POSITIVE_INFINITY)).toBe(DEFAULT_ELLIPSIS_LINES);
  });
});

describe('splitMiddleEllipsis', () => {
  it('head 始终是完整文本，tail 是固定保留的末尾字符', () => {
    expect(splitMiddleEllipsis({ text: 'abcdefgh', tailChars: 3 })).toEqual({
      head: 'abcdefgh',
      tail: 'fgh',
    });
  });

  it('缺省保留 4 个字符', () => {
    expect(splitMiddleEllipsis({ text: 'abcdefgh' }).tail).toBe('efgh');
    expect(DEFAULT_ELLIPSIS_TAIL).toBe(4);
  });

  it('按码点切分，不劈开 emoji 代理对', () => {
    const split = splitMiddleEllipsis({ text: 'ab😀cd', tailChars: 2 });

    expect(split.tail).toBe('cd');
    expect(splitMiddleEllipsis({ text: 'ab😀cd', tailChars: 3 }).tail).toBe('😀cd');
  });

  it('文本不比保留数长时 tail 为空：没有可隐藏的中段', () => {
    expect(splitMiddleEllipsis({ text: 'abc', tailChars: 4 }).tail).toBe('');
    expect(splitMiddleEllipsis({ text: '', tailChars: 4 }).tail).toBe('');
  });

  it('保留数非法时钳到 0 或缺省', () => {
    expect(splitMiddleEllipsis({ text: 'abcd', tailChars: 0 }).tail).toBe('');
    expect(splitMiddleEllipsis({ text: 'abcd', tailChars: -2 }).tail).toBe('');
    expect(splitMiddleEllipsis({ text: 'abcdefgh', tailChars: Number.NaN }).tail).toBe('efgh');
  });
});

describe('resolveEllipsisOverflow', () => {
  const base = { scrollWidth: 100, clientWidth: 100, scrollHeight: 40, clientHeight: 40 };

  it('展开态恒不溢出', () => {
    expect(
      resolveEllipsisOverflow({ ...base, mode: 'single', expanded: true, scrollWidth: 200 })
    ).toBe(false);
  });

  it('single 与 middle 看横向', () => {
    expect(
      resolveEllipsisOverflow({ ...base, mode: 'single', expanded: false, scrollWidth: 101 })
    ).toBe(true);
    expect(
      resolveEllipsisOverflow({ ...base, mode: 'middle', expanded: false, scrollWidth: 101 })
    ).toBe(true);
    expect(
      resolveEllipsisOverflow({ ...base, mode: 'single', expanded: false, scrollHeight: 999 })
    ).toBe(false);
  });

  it('multi 看纵向：line-clamp 的截断发生在纵向', () => {
    expect(
      resolveEllipsisOverflow({ ...base, mode: 'multi', expanded: false, scrollHeight: 41 })
    ).toBe(true);
    expect(
      resolveEllipsisOverflow({ ...base, mode: 'multi', expanded: false, scrollWidth: 999 })
    ).toBe(false);
  });

  it('恰好相等不算溢出', () => {
    expect(resolveEllipsisOverflow({ ...base, mode: 'single', expanded: false })).toBe(false);
    expect(resolveEllipsisOverflow({ ...base, mode: 'multi', expanded: false })).toBe(false);
  });
});

describe('getEllipsisDataState', () => {
  it('展开优先于溢出', () => {
    expect(getEllipsisDataState({ overflow: true, expanded: true })).toBe('expanded');
  });

  it('溢出且未展开为 clamped，否则 full', () => {
    expect(getEllipsisDataState({ overflow: true, expanded: false })).toBe('clamped');
    expect(getEllipsisDataState({ overflow: false, expanded: false })).toBe('full');
  });
});

describe('功能性样式', () => {
  it('展开态返回空对象，交还自然排版', () => {
    expect(getEllipsisClampStyle('single', 1, true)).toEqual({});
    expect(getEllipsisWrapperStyle('middle', true)).toEqual({});
  });

  it('single 单行尾部省略', () => {
    expect(getEllipsisClampStyle('single', 1, false)).toEqual({
      display: 'block',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    });
  });

  it('multi 用 line-clamp，行数以字符串写入', () => {
    expect(getEllipsisClampStyle('multi', 3, false)).toEqual({
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: '3',
      overflow: 'hidden',
    });
  });

  it('middle 的 head 可收缩、tail 固定且不可选中', () => {
    expect(getEllipsisClampStyle('middle', 1, false).flex).toBe('1 1 auto');
    expect(getEllipsisClampStyle('middle', 1, false).minWidth).toBe('0');
    expect(getEllipsisWrapperStyle('middle', false)).toEqual({
      display: 'flex',
      alignItems: 'baseline',
    });
    expect(getEllipsisTailStyle().userSelect).toBe('none');
    expect(getEllipsisTailStyle().flex).toBe('none');
  });

  it('非 middle 模式不需要外层布局', () => {
    expect(getEllipsisWrapperStyle('single', false)).toEqual({});
    expect(getEllipsisWrapperStyle('multi', false)).toEqual({});
  });
});
