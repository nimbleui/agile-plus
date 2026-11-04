// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  clampThumbOffset,
  DEFAULT_MIN_THUMB_SIZE,
  getScrollOffsetFromThumb,
  getThumbMetrics,
  resolveScrollbarVisibility,
} from '../src/scroll-area';

import type { ScrollbarVisibilityInput } from '../src/scroll-area';

describe('getThumbMetrics', () => {
  it('内容未溢出时长度为 0 且标记为不溢出', () => {
    expect(getThumbMetrics({ viewportSize: 100, scrollSize: 100, scrollOffset: 0 })).toEqual({
      size: 0,
      offset: 0,
      hasOverflow: false,
    });

    expect(
      getThumbMetrics({ viewportSize: 100, scrollSize: 60, scrollOffset: 0 }).hasOverflow
    ).toBe(false);
  });

  it('轨道长度为 0 时不产生溢出，避免除零', () => {
    expect(getThumbMetrics({ viewportSize: 0, scrollSize: 500, scrollOffset: 0 })).toEqual({
      size: 0,
      offset: 0,
      hasOverflow: false,
    });
  });

  it('thumb 长度等于可视占比', () => {
    // 视口 100 / 内容 200 ⇒ 占比 0.5 ⇒ thumb 50。
    expect(getThumbMetrics({ viewportSize: 100, scrollSize: 200, scrollOffset: 0 }).size).toBe(50);
  });

  it('滚动到底时 thumb 偏移落在轨道末端', () => {
    const metrics = getThumbMetrics({ viewportSize: 100, scrollSize: 200, scrollOffset: 100 });

    // 可用轨道 = 100 - 50 = 50，滚动比例 = 100 / (200 - 100) = 1。
    expect(metrics.offset).toBe(50);
  });

  it('滚动到一半时偏移也落在轨道一半', () => {
    expect(getThumbMetrics({ viewportSize: 100, scrollSize: 200, scrollOffset: 50 }).offset).toBe(
      25
    );
  });

  it('超出范围的滚动偏移被钳制，不会让 thumb 跑出轨道', () => {
    const metrics = getThumbMetrics({ viewportSize: 100, scrollSize: 200, scrollOffset: 9999 });

    expect(metrics.offset).toBe(50);

    expect(getThumbMetrics({ viewportSize: 100, scrollSize: 200, scrollOffset: -50 }).offset).toBe(
      0
    );
  });

  it('内容远大于视口时钳制到最小可点中长度', () => {
    const metrics = getThumbMetrics({ viewportSize: 100, scrollSize: 20000, scrollOffset: 0 });

    expect(metrics.size).toBe(DEFAULT_MIN_THUMB_SIZE);
  });

  it('minThumbSize 可覆盖默认下限', () => {
    expect(
      getThumbMetrics({
        viewportSize: 100,
        scrollSize: 20000,
        scrollOffset: 0,
        minThumbSize: 48,
      }).size
    ).toBe(48);
  });
});

describe('getScrollOffsetFromThumb', () => {
  it('与正算互逆：偏移能还原滚动位置', () => {
    // 只取能被轨道整除的采样点：偏移会被取整到整数像素，25 这类值会留下 1px 舍入误差。
    const cases = [0, 50, 100];

    for (const scrollOffset of cases) {
      const metrics = getThumbMetrics({ viewportSize: 100, scrollSize: 200, scrollOffset });

      const restored = getScrollOffsetFromThumb({
        thumbOffset: metrics.offset,
        viewportSize: 100,
        scrollSize: 200,
        thumbSize: metrics.size,
      });

      expect(restored).toBe(scrollOffset);
    }
  });

  it('无溢出时返回 0', () => {
    expect(
      getScrollOffsetFromThumb({
        thumbOffset: 10,
        viewportSize: 100,
        scrollSize: 100,
        thumbSize: 100,
      })
    ).toBe(0);
  });

  it('thumb 占满轨道时返回 0，避免除零', () => {
    expect(
      getScrollOffsetFromThumb({
        thumbOffset: 5,
        viewportSize: 100,
        scrollSize: 500,
        thumbSize: 100,
      })
    ).toBe(0);
  });

  it('thumb 偏移越界时被钳制', () => {
    expect(
      getScrollOffsetFromThumb({
        thumbOffset: 9999,
        viewportSize: 100,
        scrollSize: 200,
        thumbSize: 50,
      })
    ).toBe(100);
  });
});

describe('clampThumbOffset', () => {
  it('把指针拖出轨道的位移钳制回边界内', () => {
    expect(clampThumbOffset(-30, 100, 50)).toBe(0);
    expect(clampThumbOffset(999, 100, 50)).toBe(50);
    expect(clampThumbOffset(20, 100, 50)).toBe(20);
  });

  it('thumb 占满轨道时恒为 0，避免负的上界', () => {
    expect(clampThumbOffset(40, 100, 100)).toBe(0);
  });
});

describe('resolveScrollbarVisibility', () => {
  const base: ScrollbarVisibilityInput = {
    interacting: false,
    dragging: false,
    recentlyScrolled: false,
    hasOverflow: false,
  };

  it('always 即使没有溢出也常驻', () => {
    expect(resolveScrollbarVisibility(base, 'always')).toBe('visible');
  });

  it('没有溢出时其余类型都隐藏', () => {
    expect(resolveScrollbarVisibility(base, 'auto')).toBe('hidden');
    expect(resolveScrollbarVisibility(base, 'hover')).toBe('hidden');
    expect(resolveScrollbarVisibility(base, 'scroll')).toBe('hidden');
  });

  it('auto 有溢出即常驻', () => {
    expect(resolveScrollbarVisibility({ ...base, hasOverflow: true }, 'auto')).toBe('visible');
  });

  it('hover 只在指针悬停或键盘聚焦时出现', () => {
    const overflow = { ...base, hasOverflow: true };

    expect(resolveScrollbarVisibility(overflow, 'hover')).toBe('hidden');
    expect(resolveScrollbarVisibility({ ...overflow, interacting: true }, 'hover')).toBe('visible');
  });

  it('scroll 只在最近滚动窗口内出现', () => {
    const overflow = { ...base, hasOverflow: true };

    expect(resolveScrollbarVisibility(overflow, 'scroll')).toBe('hidden');
    expect(resolveScrollbarVisibility({ ...overflow, recentlyScrolled: true }, 'scroll')).toBe(
      'visible'
    );
  });

  it('拖拽中强制可见，否则 thumb 会从指针下消失', () => {
    expect(
      resolveScrollbarVisibility({ ...base, hasOverflow: true, dragging: true }, 'hover')
    ).toBe('visible');
  });

  it('拖拽不能让未溢出的滚动条凭空出现', () => {
    expect(resolveScrollbarVisibility({ ...base, dragging: true }, 'hover')).toBe('hidden');
  });
});
