import { effectScope, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useScrollArea } from '../src/useScrollArea';

import type { EffectScope } from 'vue';

import type { UseScrollAreaOptions, UseScrollAreaReturn } from '../src/useScrollArea';

const scopes: EffectScope[] = [];

/**
 * 造一个带确定几何的视口。
 *
 * jsdom 不做布局，clientHeight / scrollHeight 恒为 0，不桩掉就永远测不到溢出分支。
 * scrollTop 用可写自有属性，拖拽写回滚动位置才能被断言。
 */
function createViewport(geometry: {
  viewportSize?: number;
  scrollSize?: number;
  scrollOffset?: number;
} = {}) {
  const el = document.createElement('div');
  const { viewportSize = 100, scrollSize = 400, scrollOffset = 0 } = geometry;

  for (const [key, value] of Object.entries({
    clientHeight: viewportSize,
    scrollHeight: scrollSize,
    clientWidth: viewportSize,
    scrollWidth: scrollSize,
  })) {
    Object.defineProperty(el, key, { configurable: true, value });
  }

  Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: scrollOffset });
  Object.defineProperty(el, 'scrollLeft', { configurable: true, writable: true, value: scrollOffset });

  document.body.append(el);

  return el;
}

function setup(options: UseScrollAreaOptions = {}) {
  const scope = effectScope();

  scopes.push(scope);

  const api = scope.run(() => useScrollArea(options));

  if (!api) throw new Error('useScrollArea 未在 effect scope 内创建');

  return api;
}

/** 挂上视口并冲刷一次合并测量，让 computed 读到桩好的几何。 */
async function mountViewport(api: UseScrollAreaReturn, el: HTMLElement) {
  api.viewportRef.value = el;

  await nextTick();

  api.requestMeasure();

  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await nextTick();
}

afterEach(() => {
  vi.useRealTimers();

  for (const scope of scopes.splice(0)) scope.stop();

  document.body.innerHTML = '';
});

describe('useScrollArea 基础属性', () => {
  it('缺省 type 是 hover，视口可聚焦，dir 缺省不输出', () => {
    const api = setup();

    expect(api.type.value).toBe('hover');
    expect(api.getViewportProps()).toEqual({ tabindex: 0 });
    expect(api.getRootProps()).toEqual({ dir: undefined });
    expect(setup({ dir: 'rtl' }).getRootProps()).toEqual({ dir: 'rtl' });
  });

  it('滚动条与 thumb 都带朝向与同一个可见性状态', async () => {
    const api = setup({ type: 'always' });

    await mountViewport(api, createViewport());

    expect(api.getScrollbarProps('vertical')).toEqual({
      'data-orientation': 'vertical',
      'data-state': 'visible',
    });
    expect(api.getThumbProps('horizontal')).toEqual({
      'data-state': 'visible',
      'data-orientation': 'horizontal',
    });
  });

  it('没有视口时不抛错，几何按 0 处理', () => {
    const api = setup({ type: 'always' });

    expect(api.getThumbStyle('vertical')).toEqual({ height: '0px', transform: 'translateY(0px)' });
    expect(api.getVisibility('vertical')).toBe('visible');
  });
});

describe('useScrollArea 可见性按 type 分流', () => {
  it('无溢出时只有 always 常驻，其余隐藏', async () => {
    for (const type of ['hover', 'scroll', 'auto', 'always'] as const) {
      const api = setup({ type });

      await mountViewport(api, createViewport({ scrollSize: 100 }));
      api.onViewportPointerEnter();

      expect(api.getVisibility('vertical')).toBe(type === 'always' ? 'visible' : 'hidden');
    }
  });

  it('有溢出时 auto 常驻，hover 需要交互，scroll 需要刚滚动过', async () => {
    const auto = setup({ type: 'auto' });

    await mountViewport(auto, createViewport());

    expect(auto.getVisibility('vertical')).toBe('visible');

    const hover = setup({ type: 'hover' });

    await mountViewport(hover, createViewport());

    expect(hover.getVisibility('vertical')).toBe('hidden');

    hover.onViewportPointerEnter();

    expect(hover.getVisibility('vertical')).toBe('visible');

    hover.onViewportPointerLeave();

    expect(hover.getVisibility('vertical')).toBe('hidden');

    const scroll = setup({ type: 'scroll' });

    await mountViewport(scroll, createViewport());

    expect(scroll.getVisibility('vertical')).toBe('hidden');

    scroll.onViewportScroll();

    expect(scroll.getVisibility('vertical')).toBe('visible');
  });

  it('键盘聚焦与悬停等价：focusin 也能让 hover 型显示', async () => {
    const api = setup({ type: 'hover' });

    await mountViewport(api, createViewport());

    api.onViewportFocusin();

    expect(api.getVisibility('vertical')).toBe('visible');

    api.onViewportFocusout();

    expect(api.getVisibility('vertical')).toBe('hidden');
  });

  it('悬停滚动条只影响该朝向，不影响另一个', async () => {
    const api = setup({ type: 'hover' });

    await mountViewport(api, createViewport());

    api.onScrollbarPointerEnter('vertical');

    expect(api.getVisibility('vertical')).toBe('visible');
    expect(api.getVisibility('horizontal')).toBe('hidden');

    api.onScrollbarPointerLeave('vertical');
    api.onScrollbarPointerEnter('horizontal');

    expect(api.getVisibility('vertical')).toBe('hidden');
    expect(api.getVisibility('horizontal')).toBe('visible');
  });

  it('拖拽中即使 type=hover 且没有任何悬停也保持显示', async () => {
    const api = setup({ type: 'hover' });
    const el = createViewport();

    await mountViewport(api, el);

    const event = new MouseEvent('pointerdown', { clientY: 10, cancelable: true });

    api.onThumbPointerDown(event as unknown as PointerEvent, 'vertical');

    expect(event.defaultPrevented).toBe(true);
    expect(api.getVisibility('vertical')).toBe('visible');

    window.dispatchEvent(new Event('pointerup'));

    expect(api.getVisibility('vertical')).toBe('hidden');
  });

  it('pointercancel 与卸载走同一条收尾路径，不会把状态永久留在拖拽中', async () => {
    const api = setup({ type: 'hover' });

    await mountViewport(api, createViewport());

    api.onThumbPointerDown(
      new MouseEvent('pointerdown', { clientY: 0, cancelable: true }) as unknown as PointerEvent,
      'vertical'
    );
    window.dispatchEvent(new Event('pointercancel'));

    expect(api.getVisibility('vertical')).toBe('hidden');
  });

  it('无溢出或没有视口时按下 thumb 不进入拖拽', async () => {
    const noOverflow = setup({ type: 'hover' });

    await mountViewport(noOverflow, createViewport({ scrollSize: 100 }));

    const event = new MouseEvent('pointerdown', { clientY: 0, cancelable: true });

    noOverflow.onThumbPointerDown(event as unknown as PointerEvent, 'vertical');

    expect(event.defaultPrevented).toBe(false);
    expect(noOverflow.getVisibility('vertical')).toBe('hidden');

    const noViewport = setup({ type: 'hover' });

    expect(() =>
      noViewport.onThumbPointerDown(event as unknown as PointerEvent, 'vertical')
    ).not.toThrow();
  });
});

describe('useScrollArea 几何与拖拽换算', () => {
  it('thumb 长度按可视占比缩放，位移用 transform 而不是 top/left', async () => {
    const api = setup();

    // 100 / 400 → 占比 25%，thumb 25px，可用轨道 75px。
    await mountViewport(api, createViewport({ viewportSize: 100, scrollSize: 400 }));

    expect(api.getThumbStyle('vertical')).toEqual({
      height: '25px',
      transform: 'translateY(0px)',
    });
    expect(api.getThumbStyle('horizontal')).toEqual({
      width: '25px',
      transform: 'translateX(0px)',
    });
  });

  it('滚动到一半时 thumb 偏移按剩余轨道映射并取整', async () => {
    const api = setup();

    await mountViewport(api, createViewport({ scrollOffset: 150 }));

    // ratio 0.5 × 轨道 75 = 37.5 → 38
    expect(api.getThumbStyle('vertical').transform).toBe('translateY(38px)');
  });

  it('minThumbSize 钳制下限，并同步改变可用轨道', async () => {
    const api = setup({ minThumbSize: 40 });

    await mountViewport(api, createViewport({ scrollOffset: 150 }));

    // thumb 被抬到 40 → 轨道 60 → 0.5 × 60 = 30
    expect(api.getThumbStyle('vertical')).toEqual({
      height: '40px',
      transform: 'translateY(30px)',
    });
  });

  it('拖拽只写滚动位置，thumb 新位置由同一套测量得出', async () => {
    const api = setup();
    const el = createViewport();

    await mountViewport(api, el);

    api.onThumbPointerDown(
      new MouseEvent('pointerdown', { clientY: 10, cancelable: true }) as unknown as PointerEvent,
      'vertical'
    );

    // 位移 30 → 轨道内偏移 30 → 30/75 × 300 = 120
    window.dispatchEvent(new MouseEvent('pointermove', { clientY: 40 }));

    expect(el.scrollTop).toBe(120);

    window.dispatchEvent(new Event('pointerup'));
  });

  it('指针拖出轨道时偏移被钳制，不会把滚动位置写到极值之外', async () => {
    const api = setup();
    const el = createViewport();

    await mountViewport(api, el);

    api.onThumbPointerDown(
      new MouseEvent('pointerdown', { clientY: 0, cancelable: true }) as unknown as PointerEvent,
      'vertical'
    );
    window.dispatchEvent(new MouseEvent('pointermove', { clientY: 999 }));

    // 轨道只有 75，钳制后比例 1 → 滚动到最大值 300。
    expect(el.scrollTop).toBe(300);

    window.dispatchEvent(new Event('pointerup'));
  });

  it('两方向都可见时 corner 才显示', async () => {
    const api = setup({ type: 'hover' });

    await mountViewport(api, createViewport());

    expect(api.isCornerVisible.value).toBe(false);
    expect(api.getCornerProps()).toEqual({ 'data-state': 'hidden' });

    api.onViewportPointerEnter();

    expect(api.isCornerVisible.value).toBe(true);
    expect(api.getCornerProps()).toEqual({ 'data-state': 'visible' });
  });
});

describe('useScrollArea 隐藏延迟', () => {
  it('滚动后按 scrollHideDelay 回落，期间再次滚动会重新计时', async () => {
    const api = setup({ type: 'scroll', scrollHideDelay: 600 });

    // 先用真实定时器完成一次测量，让 hasOverflow 进入缓存；
    // 之后切假定时器只驱动隐藏计时，避免与 rAF 的 mock 互相干扰。
    await mountViewport(api, createViewport());

    vi.useFakeTimers();

    api.onViewportScroll();

    expect(api.getVisibility('vertical')).toBe('visible');

    vi.advanceTimersByTime(599);

    expect(api.getVisibility('vertical')).toBe('visible');

    api.onViewportScroll();
    vi.advanceTimersByTime(599);

    expect(api.getVisibility('vertical')).toBe('visible');

    vi.advanceTimersByTime(1);

    expect(api.getVisibility('vertical')).toBe('hidden');
  });

  it('自定义延迟生效', async () => {
    const api = setup({ type: 'scroll', scrollHideDelay: 100 });

    await mountViewport(api, createViewport());

    vi.useFakeTimers();
    api.onViewportScroll();
    vi.advanceTimersByTime(100);

    expect(api.getVisibility('vertical')).toBe('hidden');
  });
});