// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PLACEMENT,
  computeArrowPosition,
  computeAvailableSpace,
  computeBaseCoords,
  computeFloatingPosition,
  formatPlacement,
  getBoundaryRect,
  getOverflow,
  isVerticalMainAxis,
  normalizeOffset,
  oppositeAlign,
  oppositeSide,
  parsePlacement,
  resolvePlacement,
  shiftCoords,
} from '../src/floating';

import type { FloatingRect, FloatingSnapshot } from '../src/floating';

/** 视口 1000×800，锚点 100×40 位于 (400,300)，浮层 200×80。期望值均按此手算。 */
function snapshot(overrides: Partial<FloatingSnapshot> = {}): FloatingSnapshot {
  return {
    reference: { x: 400, y: 300, width: 100, height: 40 },
    floating: { x: 0, y: 0, width: 200, height: 80 },
    viewport: { width: 1000, height: 800 },
    ...overrides,
  };
}

function reference(rect: Partial<FloatingRect>): FloatingSnapshot {
  return snapshot({ reference: { x: 400, y: 300, width: 100, height: 40, ...rect } });
}

describe('placement 解析与轴判定', () => {
  it('只给边时补 center，拼回时省略 center 后缀', () => {
    expect(parsePlacement('bottom')).toEqual({ side: 'bottom', align: 'center' });
    expect(parsePlacement('left-start')).toEqual({ side: 'left', align: 'start' });
    expect(formatPlacement('bottom', 'center')).toBe('bottom');
    expect(formatPlacement('left', 'start')).toBe('left-start');
    expect(DEFAULT_PLACEMENT).toBe('bottom');
  });

  it('对边与对立对齐互为逆运算，center 没有对立态', () => {
    expect(oppositeSide('top')).toBe('bottom');
    expect(oppositeSide('left')).toBe('right');
    expect(oppositeAlign('start')).toBe('end');
    expect(oppositeAlign('center')).toBe('center');
  });

  it('top/bottom 的主轴是纵向，left/right 是横向', () => {
    expect(isVerticalMainAxis('top')).toBe(true);
    expect(isVerticalMainAxis('bottom')).toBe(true);
    expect(isVerticalMainAxis('left')).toBe(false);
    expect(isVerticalMainAxis('right')).toBe(false);
  });

  it('offset 的数字写法等价于 mainAxis，缺省轴补 0', () => {
    expect(normalizeOffset(8)).toEqual({ mainAxis: 8, crossAxis: 0 });
    expect(normalizeOffset(undefined)).toEqual({ mainAxis: 0, crossAxis: 0 });
    expect(normalizeOffset({ crossAxis: 4 })).toEqual({ mainAxis: 0, crossAxis: 4 });
  });

  it('缺省边界是整个视口，给了 boundary 就用它', () => {
    expect(getBoundaryRect(snapshot())).toEqual({ x: 0, y: 0, width: 1000, height: 800 });

    const boundary = { x: 100, y: 100, width: 300, height: 200 };

    expect(getBoundaryRect(snapshot({ boundary }))).toEqual(boundary);
  });
});

describe('基础坐标', () => {
  const offset = { mainAxis: 0, crossAxis: 0 };

  it('四条边各自的居中坐标', () => {
    expect(computeBaseCoords(snapshot(), 'bottom', 'center', offset)).toEqual({ x: 350, y: 340 });
    expect(computeBaseCoords(snapshot(), 'top', 'center', offset)).toEqual({ x: 350, y: 220 });
    expect(computeBaseCoords(snapshot(), 'right', 'center', offset)).toEqual({ x: 500, y: 280 });
    expect(computeBaseCoords(snapshot(), 'left', 'center', offset)).toEqual({ x: 200, y: 280 });
  });

  it('start/end 贴的是两条边，不是中点', () => {
    expect(computeBaseCoords(snapshot(), 'bottom', 'start', offset).x).toBe(400);
    expect(computeBaseCoords(snapshot(), 'bottom', 'end', offset).x).toBe(300);
    expect(computeBaseCoords(snapshot(), 'right', 'start', offset).y).toBe(300);
    expect(computeBaseCoords(snapshot(), 'right', 'end', offset).y).toBe(260);
  });

  it('mainAxis 拉开与锚点的间距，方向随边翻转', () => {
    const gap = { mainAxis: 8, crossAxis: 0 };

    expect(computeBaseCoords(snapshot(), 'bottom', 'center', gap).y).toBe(348);
    expect(computeBaseCoords(snapshot(), 'top', 'center', gap).y).toBe(212);
    expect(computeBaseCoords(snapshot(), 'right', 'center', gap).x).toBe(508);
    expect(computeBaseCoords(snapshot(), 'left', 'center', gap).x).toBe(192);
  });

  it('crossAxis 只平移交叉轴', () => {
    const cross = { mainAxis: 0, crossAxis: 10 };

    expect(computeBaseCoords(snapshot(), 'bottom', 'center', cross)).toEqual({ x: 360, y: 340 });
    expect(computeBaseCoords(snapshot(), 'right', 'center', cross)).toEqual({ x: 500, y: 290 });
  });

  it('浮层的 x/y 不参与计算，只有尺寸有意义', () => {
    const stale = snapshot({ floating: { x: 999, y: 999, width: 200, height: 80 } });

    expect(computeBaseCoords(stale, 'bottom', 'center', offset)).toEqual({ x: 350, y: 340 });
  });
});

describe('溢出计算', () => {
  it('正数表示越界，负数表示余量', () => {
    const overflow = getOverflow(
      { x: -10, y: 20, width: 200, height: 80 },
      getBoundaryRect(snapshot()),
      0
    );

    expect(overflow.left).toBe(10);
    expect(overflow.top).toBe(-20);
    expect(overflow.right).toBe(190 - 1000);
    expect(overflow.bottom).toBe(100 - 800);
  });

  it('padding 收窄可用区域', () => {
    const overflow = getOverflow(
      { x: 5, y: 5, width: 10, height: 10 },
      { x: 0, y: 0, width: 100, height: 100 },
      8
    );

    expect(overflow.left).toBe(3);
    expect(overflow.top).toBe(3);
  });
});

describe('翻转：对边', () => {
  it('下方放不下且上方放得下时翻到 top', () => {
    const nearBottom = reference({ y: 750 });

    expect(resolvePlacement(nearBottom, { placement: 'bottom' })).toBe('top');
  });

  it('上方放不下时翻到 bottom', () => {
    const nearTop = reference({ y: 10 });

    expect(resolvePlacement(nearTop, { placement: 'top' })).toBe('bottom');
  });

  it('左右同理', () => {
    expect(resolvePlacement(reference({ x: 950 }), { placement: 'right' })).toBe('left');
    expect(resolvePlacement(reference({ x: 10 }), { placement: 'left' })).toBe('right');
  });

  it('两侧都放不下时选溢出较小的一侧', () => {
    const cramped = snapshot({
      reference: { x: 400, y: 60, width: 100, height: 20 },
      viewport: { width: 1000, height: 120 },
    });

    // bottom 溢出 40，top 溢出 20 → 翻到 top
    expect(resolvePlacement(cramped, { placement: 'bottom' })).toBe('top');
  });

  it('两侧溢出相同则保持请求的位置', () => {
    const symmetric = snapshot({
      reference: { x: 400, y: 50, width: 100, height: 20 },
      viewport: { width: 1000, height: 120 },
    });

    expect(resolvePlacement(symmetric, { placement: 'bottom' })).toBe('bottom');
  });

  it('空间充足时不翻转', () => {
    expect(resolvePlacement(snapshot(), { placement: 'bottom' })).toBe('bottom');
  });

  it('flip=false 时即使溢出也保持请求位置', () => {
    expect(resolvePlacement(reference({ y: 750 }), { placement: 'bottom', flip: false })).toBe(
      'bottom'
    );
  });

  it('padding 会促成翻转', () => {
    // 锚点 y=700，浮层高 80：bottom 起点 740、末端 820，视口 800 → 溢出 20。
    const tight = reference({ y: 700 });

    expect(resolvePlacement(tight, { placement: 'bottom', padding: 0 })).toBe('top');
    expect(resolvePlacement(reference({ y: 690 }), { placement: 'bottom', padding: 20 })).toBe(
      'top'
    );
  });
});

describe('翻转：对立对齐', () => {
  it('end 对齐左侧出界时翻到 start', () => {
    const nearLeft = reference({ x: 10 });

    expect(resolvePlacement(nearLeft, { placement: 'bottom-end' })).toBe('bottom-start');
  });

  it('start 对齐右侧出界时翻到 end', () => {
    const nearRight = reference({ x: 950 });

    expect(resolvePlacement(nearRight, { placement: 'bottom-start' })).toBe('bottom-end');
  });

  it('center 没有对立态，交叉轴出界交给 shift', () => {
    expect(resolvePlacement(reference({ x: 0 }), { placement: 'bottom' })).toBe('bottom');
  });

  it('对边翻转后仍按新边判定对齐', () => {
    const corner = reference({ x: 10, y: 750 });

    expect(resolvePlacement(corner, { placement: 'bottom-end' })).toBe('top-start');
  });

  it('flip=false 同时禁用对边与对齐翻转', () => {
    expect(resolvePlacement(reference({ x: 10 }), { placement: 'bottom-end', flip: false })).toBe(
      'bottom-end'
    );
  });
});

describe('交叉轴钳制', () => {
  it('左侧出界时贴左边缘，主轴不动', () => {
    const nearLeft = reference({ x: 0, width: 20 });
    const result = computeFloatingPosition(nearLeft, { placement: 'bottom' });

    expect(result.x).toBe(0);
    expect(result.y).toBe(340);
  });

  it('右侧出界时贴右边缘', () => {
    const nearRight = reference({ x: 980, width: 20 });

    expect(computeFloatingPosition(nearRight, { placement: 'bottom' }).x).toBe(800);
  });

  it('padding 生效', () => {
    const nearLeft = reference({ x: 0, width: 20 });

    expect(computeFloatingPosition(nearLeft, { placement: 'bottom', padding: 8 }).x).toBe(8);
  });

  it('左右朝向时钳制的是 y', () => {
    const nearTop = reference({ y: 0, height: 20 });
    const result = computeFloatingPosition(nearTop, { placement: 'right' });

    expect(result.y).toBe(0);
    expect(result.x).toBe(500);
  });

  it('刻意不动主轴：flip=false 时纵向溢出保留，避免压掉与锚点的间距', () => {
    const below = reference({ y: 780 });
    const result = computeFloatingPosition(below, { placement: 'bottom', flip: false });

    expect(result.y).toBe(820);
  });

  it('shift=false 时完全不钳制', () => {
    const nearLeft = reference({ x: 0, width: 20 });

    expect(computeFloatingPosition(nearLeft, { placement: 'bottom', shift: false }).x).toBe(-90);
  });

  it('浮层比边界还宽时贴起始边，而不是居中后两侧都被裁', () => {
    const narrow = snapshot({ viewport: { width: 100, height: 800 } });

    expect(computeFloatingPosition(narrow, { placement: 'bottom' }).x).toBe(0);
  });

  it('boundary 覆盖视口成为钳制依据', () => {
    const bounded = snapshot({ boundary: { x: 100, y: 100, width: 300, height: 200 } });
    const result = computeFloatingPosition(bounded, { placement: 'bottom' });

    // 居中坐标 350，右边界 400 - 200 = 200 → 钳到 200
    expect(result.x).toBe(200);
  });

  it('shiftCoords 可单独调用，结果与编排一致', () => {
    const nearLeft = reference({ x: 0, width: 20 });

    expect(shiftCoords({ x: -90, y: 340 }, nearLeft, 'bottom', 0)).toEqual({ x: 0, y: 340 });
  });
});

describe('箭头', () => {
  it('对准锚点中心，返回交叉轴偏移，另一轴为 null', () => {
    const result = computeFloatingPosition(snapshot(), {
      placement: 'bottom',
      arrow: { size: 10 },
    });

    // 锚点中心 x=450，浮层 x=350 → 450-350-5 = 95
    expect(result.arrow).toEqual({ x: 95, y: null });
  });

  it('左右朝向时返回 y 偏移', () => {
    const result = computeFloatingPosition(snapshot(), { placement: 'right', arrow: { size: 10 } });

    // 锚点中心 y=320，浮层 y=280 → 320-280-5 = 35
    expect(result.arrow).toEqual({ x: null, y: 35 });
  });

  it('用钳制之后的坐标：浮层被推走后箭头仍指向锚点', () => {
    const nearRight = reference({ x: 980, width: 20 });
    const result = computeFloatingPosition(nearRight, {
      placement: 'bottom',
      arrow: { size: 10 },
    });

    // 浮层被钳到 x=800，锚点中心 990 → 990-800-5 = 185（若用钳制前的 890 会得到 95）
    expect(result.x).toBe(800);
    expect(result.arrow).toEqual({ x: 185, y: null });
  });

  it('两端留白把偏移钳在可用范围内', () => {
    const result = computeFloatingPosition(snapshot(), {
      placement: 'bottom',
      arrow: { size: 10, padding: 120 },
    });

    // 期望 95，但可用区间是 [120, 70]（无解）→ 退化为居中 max(0,(200-10)/2)=95
    expect(result.arrow?.x).toBe(95);

    const clamped = computeFloatingPosition(reference({ x: 0, width: 20 }), {
      placement: 'bottom',
      arrow: { size: 10, padding: 20 },
    });

    // 锚点中心 10，浮层被钳到 0 → 10-0-5=5，小于最小留白 20 → 钳到 20
    expect(clamped.arrow?.x).toBe(20);
  });

  it('箭头比浮层还宽时不产生负偏移', () => {
    const tiny = snapshot({ floating: { x: 0, y: 0, width: 20, height: 80 } });
    const result = computeFloatingPosition(tiny, { placement: 'bottom', arrow: { size: 30 } });

    expect(result.arrow?.x).toBeGreaterThanOrEqual(0);
  });

  it('未配置 arrow 时结果为 null', () => {
    expect(computeFloatingPosition(snapshot()).arrow).toBeNull();
  });

  it('computeArrowPosition 可单独调用', () => {
    expect(computeArrowPosition(snapshot(), { x: 350, y: 340 }, 'bottom', { size: 10 })).toEqual({
      x: 95,
      y: null,
    });
  });
});

describe('编排顺序与确定性', () => {
  it('同一份快照多次计算结果完全一致（无隐藏状态）', () => {
    const input = reference({ x: 10, y: 750 });
    const options = { placement: 'bottom-end' as const, arrow: { size: 10 }, padding: 4 };

    expect(computeFloatingPosition(input, options)).toEqual(
      computeFloatingPosition(input, options)
    );
  });

  it('不修改传入的快照', () => {
    const input = snapshot();
    const before = JSON.stringify(input);

    computeFloatingPosition(input, { placement: 'top-start', arrow: { size: 10 } });

    expect(JSON.stringify(input)).toBe(before);
  });

  it('翻转 + 钳制 + 箭头在角落场景同时生效', () => {
    const corner = reference({ x: 980, y: 780, width: 20, height: 20 });
    const result = computeFloatingPosition(corner, {
      placement: 'bottom-end',
      offset: 8,
      padding: 4,
      arrow: { size: 10 },
    });

    // 下方溢出 → top；end 对齐右侧只溢出 4，而 start 会溢出 184 → 保持 end；再按 padding 钳制
    expect(result.placement).toBe('top-end');
    expect(result.y).toBe(780 - 80 - 8);
    expect(result.x).toBe(1000 - 4 - 200);
    expect(result.arrow?.x).not.toBeNull();
  });
});

describe('computeAvailableSpace', () => {
  it('bottom 侧扣掉锚点自身、offset 与 padding', () => {
    // 视口高 800，锚点底 340，offset 8，padding 4 → 800 - 4 - 340 - 8 = 448
    expect(computeAvailableSpace(snapshot(), 'bottom', { offset: 8, padding: 4 })).toEqual({
      width: 992,
      height: 448,
    });
  });

  it('top 侧量的是锚点顶到边界顶的距离', () => {
    // 锚点顶 300，offset 8，padding 4 → 300 - 8 - 4 = 288
    expect(computeAvailableSpace(snapshot(), 'top', { offset: 8, padding: 4 })).toEqual({
      width: 992,
      height: 288,
    });
  });

  it('左右侧主轴是宽度，交叉轴高度占满边界', () => {
    // 锚点左 400，offset 8，padding 4 → 400 - 8 - 4 = 388
    expect(computeAvailableSpace(snapshot(), 'left', { offset: 8, padding: 4 })).toEqual({
      width: 388,
      height: 792,
    });
    // 锚点右 500 → 1000 - 4 - 500 - 8 = 488
    expect(computeAvailableSpace(snapshot(), 'right', { offset: 8, padding: 4 })).toEqual({
      width: 488,
      height: 792,
    });
  });

  it('带对齐后缀的位置按边计算，对齐不影响可用空间', () => {
    expect(computeAvailableSpace(snapshot(), 'bottom-start', { offset: 8, padding: 4 })).toEqual(
      computeAvailableSpace(snapshot(), 'bottom', { offset: 8, padding: 4 })
    );
  });

  it('offset 给对象时只取主轴分量', () => {
    expect(
      computeAvailableSpace(snapshot(), 'bottom', { offset: { mainAxis: 8, crossAxis: 40 } })
    ).toEqual(computeAvailableSpace(snapshot(), 'bottom', { offset: 8 }));
  });

  it('空间不足时钳到 0，不产出负高度', () => {
    const corner = reference({ x: 400, y: 790, width: 100, height: 40 });

    expect(computeAvailableSpace(corner, 'bottom', { offset: 8 }).height).toBe(0);
  });

  it('boundary 取代视口成为量取依据', () => {
    const bounded = snapshot({ boundary: { x: 100, y: 100, width: 300, height: 200 } });

    // 边界底 300，锚点底 340 已在边界外 → 0；交叉轴宽 300
    expect(computeAvailableSpace(bounded, 'bottom', {})).toEqual({ width: 300, height: 0 });
    // 边界顶 100，锚点顶 300 → 200
    expect(computeAvailableSpace(bounded, 'top', {})).toEqual({ width: 300, height: 200 });
  });

  it('与定位共用同一份快照：翻转后取的是实际那一侧的空间', () => {
    const corner = reference({ x: 400, y: 750, width: 100, height: 40 });
    const options = { placement: 'bottom' as const, offset: 8, padding: 4 };
    const result = computeFloatingPosition(corner, options);

    expect(result.placement).toBe('top');
    // 750 - 8 - 4 = 738，而不是下方那侧的 0
    expect(computeAvailableSpace(corner, result.placement, options).height).toBe(738);
  });

  it('不修改传入的快照', () => {
    const input = snapshot();
    const before = JSON.stringify(input);

    computeAvailableSpace(input, 'left-start', { offset: 8, padding: 4 });

    expect(JSON.stringify(input)).toBe(before);
  });
});
