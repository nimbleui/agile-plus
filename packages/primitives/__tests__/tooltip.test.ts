// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TOOLTIP_DELAY,
  DEFAULT_TOOLTIP_SKIP_DELAY,
  getGraceAreaPolygon,
  getTooltipDataState,
  isPointInPolygon,
  isPointInRect,
  isPointerInGraceArea,
  resolveOpenDelay,
} from '../src/tooltip';

import type { FloatingRect } from '../src/floating';

const reference: FloatingRect = { x: 100, y: 100, width: 80, height: 20 };
const floating: FloatingRect = { x: 90, y: 140, width: 100, height: 40 };

describe('resolveOpenDelay', () => {
  const base = { delayDuration: 700, skipDelayDuration: 300, now: 10_000 };

  it('从未打开过时不跳过延迟，首次触发要给用户只是路过的机会', () => {
    expect(resolveOpenDelay({ ...base, lastClosedAt: null })).toBe(700);
  });

  it('上一个提示刚关闭，落在时间窗内则立即打开', () => {
    expect(resolveOpenDelay({ ...base, lastClosedAt: 9_900 })).toBe(0);
  });

  it('超出时间窗回到常规延迟', () => {
    expect(resolveOpenDelay({ ...base, lastClosedAt: 9_000 })).toBe(700);
  });

  it('恰好等于时间窗不算在内（严格小于）', () => {
    expect(resolveOpenDelay({ ...base, lastClosedAt: 9_700 })).toBe(700);
    expect(resolveOpenDelay({ ...base, lastClosedAt: 9_701 })).toBe(0);
  });

  it('skipDelayDuration 为 0 时禁用跳过', () => {
    expect(resolveOpenDelay({ ...base, skipDelayDuration: 0, lastClosedAt: 10_000 })).toBe(700);
  });

  it('delayDuration 为 0 时始终立即打开', () => {
    expect(resolveOpenDelay({ ...base, delayDuration: 0, lastClosedAt: null })).toBe(0);
  });

  it('缺省值与 Radix 对齐', () => {
    expect(DEFAULT_TOOLTIP_DELAY).toBe(700);
    expect(DEFAULT_TOOLTIP_SKIP_DELAY).toBe(300);
  });
});

describe('getTooltipDataState', () => {
  it('关闭态不区分来源', () => {
    expect(getTooltipDataState(false, false)).toBe('closed');
    expect(getTooltipDataState(false, true)).toBe('closed');
  });

  it('打开态区分延迟与即时，供样式层分别给过渡', () => {
    expect(getTooltipDataState(true, false)).toBe('delayed-open');
    expect(getTooltipDataState(true, true)).toBe('instant-open');
  });
});

describe('isPointInRect', () => {
  it('内部与边界都算命中', () => {
    expect(isPointInRect({ x: 140, y: 110 }, reference)).toBe(true);
    expect(isPointInRect({ x: 100, y: 100 }, reference)).toBe(true);
    expect(isPointInRect({ x: 180, y: 120 }, reference)).toBe(true);
  });

  it('外部不命中', () => {
    expect(isPointInRect({ x: 99, y: 110 }, reference)).toBe(false);
    expect(isPointInRect({ x: 140, y: 121 }, reference)).toBe(false);
  });
});

describe('isPointInPolygon', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('内部命中、外部不命中', () => {
    expect(isPointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(isPointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
    expect(isPointInPolygon({ x: 5, y: -1 }, square)).toBe(false);
  });

  it('顶点顺序不影响结果', () => {
    expect(isPointInPolygon({ x: 5, y: 5 }, [...square].reverse())).toBe(true);
    expect(isPointInPolygon({ x: 15, y: 5 }, [...square].reverse())).toBe(false);
  });

  it('凹多边形也正确（射线法不要求凸）', () => {
    const concave = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 5, y: 4 },
      { x: 0, y: 10 },
    ];

    expect(isPointInPolygon({ x: 5, y: 2 }, concave)).toBe(true);
    expect(isPointInPolygon({ x: 5, y: 8 }, concave)).toBe(false);
  });
});

describe('getGraceAreaPolygon', () => {
  it('bottom 连接触发元素下边与提示上边', () => {
    expect(getGraceAreaPolygon(reference, floating, 'bottom')).toEqual([
      { x: 100, y: 120 },
      { x: 180, y: 120 },
      { x: 190, y: 140 },
      { x: 90, y: 140 },
    ]);
  });

  it('top 连接触发元素上边与提示下边', () => {
    const below: FloatingRect = { x: 100, y: 200, width: 80, height: 20 };
    const above: FloatingRect = { x: 90, y: 140, width: 100, height: 40 };

    expect(getGraceAreaPolygon(below, above, 'top')).toEqual([
      { x: 100, y: 200 },
      { x: 180, y: 200 },
      { x: 190, y: 180 },
      { x: 90, y: 180 },
    ]);
  });

  it('right 连接触发元素右边与提示左边', () => {
    const left: FloatingRect = { x: 100, y: 100, width: 80, height: 20 };
    const right: FloatingRect = { x: 200, y: 90, width: 100, height: 40 };

    expect(getGraceAreaPolygon(left, right, 'right')).toEqual([
      { x: 180, y: 100 },
      { x: 180, y: 120 },
      { x: 200, y: 130 },
      { x: 200, y: 90 },
    ]);
  });

  it('left 连接触发元素左边与提示右边', () => {
    const right: FloatingRect = { x: 200, y: 100, width: 80, height: 20 };
    const left: FloatingRect = { x: 80, y: 90, width: 100, height: 40 };

    expect(getGraceAreaPolygon(right, left, 'left')).toEqual([
      { x: 200, y: 100 },
      { x: 200, y: 120 },
      { x: 180, y: 130 },
      { x: 180, y: 90 },
    ]);
  });
});

describe('isPointerInGraceArea', () => {
  const input = { reference, floating, side: 'bottom' as const };

  it('指针在触发元素或提示内容内都算仍在交互', () => {
    expect(isPointerInGraceArea({ ...input, pointer: { x: 110, y: 110 } })).toBe(true);
    expect(isPointerInGraceArea({ ...input, pointer: { x: 100, y: 150 } })).toBe(true);
  });

  it('两者之间的空隙里也算在内，用户才能把指针移进提示', () => {
    expect(isPointerInGraceArea({ ...input, pointer: { x: 140, y: 130 } })).toBe(true);
    expect(isPointerInGraceArea({ ...input, pointer: { x: 140, y: 121 } })).toBe(true);
  });

  it('斜向穿过容差区也算在内（用整条边而不是中心连线）', () => {
    // y=135 处多边形左边界为 x=92.5，97 在其右侧
    expect(isPointerInGraceArea({ ...input, pointer: { x: 97, y: 135 } })).toBe(true);
  });

  it('空隙高度上但在四边形之外不算', () => {
    // y=130 处可用 x 区间是 [95,185]
    expect(isPointerInGraceArea({ ...input, pointer: { x: 80, y: 130 } })).toBe(false);
    expect(isPointerInGraceArea({ ...input, pointer: { x: 200, y: 130 } })).toBe(false);
  });

  it('远离两个元素时不算', () => {
    expect(isPointerInGraceArea({ ...input, pointer: { x: 500, y: 500 } })).toBe(false);
    expect(isPointerInGraceArea({ ...input, pointer: { x: 140, y: 300 } })).toBe(false);
  });

  it('四个朝向各自成立', () => {
    expect(
      isPointerInGraceArea({
        reference: { x: 100, y: 200, width: 80, height: 20 },
        floating: { x: 90, y: 140, width: 100, height: 40 },
        side: 'top',
        pointer: { x: 140, y: 190 },
      })
    ).toBe(true);

    expect(
      isPointerInGraceArea({
        reference: { x: 100, y: 100, width: 80, height: 20 },
        floating: { x: 200, y: 90, width: 100, height: 40 },
        side: 'right',
        pointer: { x: 190, y: 110 },
      })
    ).toBe(true);

    expect(
      isPointerInGraceArea({
        reference: { x: 200, y: 100, width: 80, height: 20 },
        floating: { x: 80, y: 90, width: 100, height: 40 },
        side: 'left',
        pointer: { x: 190, y: 110 },
      })
    ).toBe(true);
  });
});
