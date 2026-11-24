import { effectScope, nextTick, ref, toValue } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVirtualList } from '../src/useVirtualList';

import type { EffectScope } from 'vue';

import type { UseVirtualListOptions, UseVirtualListReturn } from '../src/useVirtualList';

/** 测试统一用 20 像素估算：视口 100 恰好 5 行，所有期望值都能口算复核。 */
const ESTIMATE = 20;

const VIEWPORT = 100;

/**
 * 可手动触发的 ResizeObserver 替身。
 *
 * jsdom 不做布局，`clientHeight` / `offsetHeight` 恒为 0、`scrollTop` 默认只读，不桩掉就永远
 * 走不到测量分支；`ResizeObserver` 在 jsdom 里干脆不存在，而「行内容后来长高了」这条路径
 * 必须能自己点一次，否则动态高度最核心的那段逻辑等于没测。
 */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];

  private readonly targets = new Set<Element>();

  private readonly callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.targets.add(element);
  }

  unobserve(element: Element): void {
    this.targets.delete(element);
  }

  disconnect(): void {
    this.targets.clear();
  }

  get targetCount(): number {
    return this.targets.size;
  }

  has(element: Element): boolean {
    return this.targets.has(element);
  }

  trigger(): void {
    this.callback();
  }
}

interface Fixture {
  api: UseVirtualListReturn;

  scope: EffectScope;

  viewport: HTMLElement;

  content: HTMLElement;

  observer: FakeResizeObserver;

  /** 改变某一项的「真实高度」，等价于图片加载完成或文本换行后 DOM 自己变了。 */
  setRowHeight(index: number, height: number): void;

  /** 改变容器的真实可视高度，并触发尺寸观察回调。 */
  setViewportHeight(height: number): void;

  /** 把子元素同步成当前渲染区间，等价于一次模板 patch。 */
  syncDom(): void;
}

let scopes: EffectScope[] = [];

async function flushFrame(): Promise<void> {
  await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
}

/**
 * 一轮完整收敛：响应式更新 → 同步「模板 patch」→ 帧回调里读新行的高度。
 *
 * 动态虚拟列表本来就是两帧一收敛（第一帧按估算定位，渲染后才量真实高度），
 * 断言必须落在稳定态上，否则测到的是中间过程。
 */
async function settle(syncDom: () => void, rounds = 4): Promise<void> {
  for (let round = 0; round < rounds; round += 1) {
    await nextTick();
    syncDom();
    await flushFrame();
  }

  await nextTick();
}

/** 滚到指定位置并等收敛。 */
async function scrollTo(fixture: Fixture, offset: number): Promise<void> {
  fixture.viewport.scrollTop = offset;
  fixture.viewport.dispatchEvent(new Event('scroll'));

  await settle(fixture.syncDom);
}

/**
 * 取最近一次创建的观察器。
 *
 * 观察对象是「渲染出来的行」，而行要等第一帧量过之后才登记，所以不能在 `setup` 里同步取：
 * 这里保持惰性访问，谁真的走测量路径谁就会在没登记时拿到明确报错，而不是静默跳过。
 */
function lastObserver(): FakeResizeObserver {
  const observer = FakeResizeObserver.instances[FakeResizeObserver.instances.length - 1];

  if (!observer) throw new Error('未创建尺寸观察器，测量路径不会被触发');

  return observer;
}

function setup(options: UseVirtualListOptions): Fixture {
  const viewport = document.createElement('div');

  Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: VIEWPORT });
  Object.defineProperty(viewport, 'scrollTop', { configurable: true, writable: true, value: 0 });

  const content = document.createElement('div');

  viewport.append(content);
  document.body.append(viewport);

  // 与 useVirtualList 内部的 `toSize(…, DEFAULT)` 取值一致，否则桩高度与树里的估算
  // 会差一个常量，每个用例都得先消化一次假补丁。
  function currentEstimate(): number {
    const value = options.estimateSize === undefined ? ESTIMATE : toValue(options.estimateSize);

    return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, value) : ESTIMATE;
  }

  const rowEls = new Map<number, HTMLElement>();
  const rowHeights = new Map<number, number>();

  function rowsFor(index: number): HTMLElement {
    const existing = rowEls.get(index);

    if (existing) return existing;

    const element = document.createElement('div');

    Object.defineProperty(element, 'offsetHeight', {
      configurable: true,
      get: () => rowHeights.get(index) ?? currentEstimate(),
    });

    rowEls.set(index, element);

    return element;
  }

  function syncDom(): void {
    const desired = api.visibleIndices.value.map(rowsFor);
    const current = Array.from(content.children);

    if (
      current.length === desired.length &&
      current.every((element, position) => element === desired[position])
    ) {
      return;
    }

    content.replaceChildren(...desired);
  }

  const scope = effectScope();
  const api = scope.run(() => useVirtualList({ estimateSize: ESTIMATE, ...options }));

  if (!api) throw new Error('composable 未在 effect scope 内创建');

  scopes.push(scope);

  api.setViewportElement(viewport);
  api.setContentElement(content);

  return {
    api,
    scope,
    viewport,
    content,
    get observer(): FakeResizeObserver {
      return lastObserver();
    },
    setRowHeight: (index, height) => {
      rowHeights.set(index, height);

      // 只有在窗口里的行才挂着观察：这正是「行滚出窗口后不再被测量」那条约定的另一面，
      // 所以未登记的行改高度时不做触发，交给下一次滚动或数据变化去量。
      if (rowEls.has(index)) lastObserver().trigger();
    },
    setViewportHeight: (height) => {
      Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: height });
      lastObserver().trigger();
    },
    syncDom,
  };
}

beforeEach(() => {
  FakeResizeObserver.instances = [];
  scopes = [];
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
});

afterEach(() => {
  for (const scope of scopes) scope.stop();

  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('useVirtualList 初始渲染', () => {
  it('未测量时按估算铺开，区间等于视口行数加前后预渲染', async () => {
    const { api, syncDom } = setup({ count: 1000 });

    await settle(syncDom);

    expect(api.totalSize.value).toBe('20000px');
    // 下沿 100 正好落在第 5 项边界，该项被算进可见区，再向后扩默认 3 项。
    expect(api.visibleIndices.value).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(api.paddingTop.value).toBe('0px');
    expect(api.paddingBottom.value).toBe('19820px');
  });

  it('容器尚未绑定时也渲染首项加预渲染量，SSR 首帧不是空的', async () => {
    const scope = effectScope();
    const api = scope.run(() => useVirtualList({ count: 50, estimateSize: 30, overscan: 2 }));

    if (!api) throw new Error('composable 未在 effect scope 内创建');

    await nextTick();

    expect(api.visibleIndices.value).toEqual([0, 1, 2]);
    expect(api.paddingTop.value).toBe('0px');

    scope.stop();
  });

  it('空列表不渲染任何行且总高为 0', async () => {
    const { api, syncDom } = setup({ count: 0 });

    await settle(syncDom);

    expect(api.visibleIndices.value).toEqual([]);
    expect(api.totalSize.value).toBe('0px');
    expect(api.paddingBottom.value).toBe('0px');
  });

  it('非法项数按 0 处理，不会渲染出 NaN 区间', async () => {
    const { api, syncDom } = setup({ count: Number.NaN });

    await settle(syncDom);

    expect(api.visibleIndices.value).toEqual([]);
    expect(api.totalSize.value).toBe('0px');
  });
});

describe('useVirtualList 滚动定位', () => {
  it('滚动到中段时上内边距等于该区段之前的累计高度', async () => {
    const fixture = setup({ count: 100, overscan: 0 });

    await scrollTo(fixture, 200);

    expect(fixture.api.startIndex.value).toBe(10);
    expect(fixture.api.endIndex.value).toBe(15);
    expect(fixture.api.paddingTop.value).toBe('200px');
    expect(fixture.api.scrollTop.value).toBe(200);
  });

  it('真实高度与估算不符时总高随之更新', async () => {
    const fixture = setup({ count: 50, overscan: 0 });

    await settle(fixture.syncDom);

    expect(fixture.api.totalSize.value).toBe('1000px');

    fixture.setRowHeight(0, 120);

    await settle(fixture.syncDom);

    expect(fixture.api.totalSize.value).toBe('1100px');
  });

  it('十万项滚到深处仍只渲染常数级行数', async () => {
    const fixture = setup({ count: 100_000, overscan: 0 });

    await scrollTo(fixture, 800_000);

    expect(fixture.api.startIndex.value).toBe(40_000);
    expect(fixture.api.visibleIndices.value).toEqual([
      40_000, 40_001, 40_002, 40_003, 40_004, 40_005,
    ]);
  });

  it('容器自身进入尺寸观察，拉高后立即扩展渲染区间', async () => {
    const fixture = setup({ count: 100, overscan: 0 });

    await settle(fixture.syncDom);

    expect(fixture.observer.has(fixture.viewport)).toBe(true);
    expect(fixture.api.visibleIndices.value).toHaveLength(6);

    fixture.setViewportHeight(200);

    await settle(fixture.syncDom);

    expect(fixture.api.viewportSize.value).toBe(200);
    expect(fixture.api.visibleIndices.value).toEqual(
      Array.from({ length: 11 }, (_, index) => index)
    );
  });

  it('行滚出窗口后观察集合被整体换成新行，不累加残留目标', async () => {
    const fixture = setup({ count: 2_000, overscan: 0 });

    await scrollTo(fixture, 2_000);

    expect(fixture.observer.targetCount).toBe(fixture.api.visibleIndices.value.length + 1);

    await scrollTo(fixture, 4_000);

    expect(fixture.observer.targetCount).toBe(fixture.api.visibleIndices.value.length + 1);
    expect(fixture.api.startIndex.value).toBe(200);
  });
});

describe('useVirtualList 动态高度不跳动', () => {
  it('前置预渲染带内的行测高后补偿滚动位置，正在看的内容留在原位', async () => {
    const fixture = setup({ count: 100, overscan: 3 });

    await scrollTo(fixture, 400);

    expect(fixture.api.startIndex.value).toBe(17);
    expect(fixture.viewport.scrollTop).toBe(400);

    // 第 19 项在锚点（第 20 项）之上、渲染区间之内：这一带是唯一「量得到、又在视口上方」的区域，
    // 它长高 60 会把正在阅读的内容整体顶下去，必须补回滚动位置。
    fixture.setRowHeight(19, 80);

    await settle(fixture.syncDom);

    expect(fixture.viewport.scrollTop).toBe(460);
    expect(fixture.api.scrollTop.value).toBe(460);
    // 补偿只动滚动位置：渲染区间首项仍是锚点前 3 项，总高则如实记下了这一行的长高。
    expect(fixture.api.startIndex.value).toBe(17);
    expect(fixture.api.totalSize.value).toBe(`${100 * ESTIMATE + 60}px`);
  });

  it('滚动提交新区间后，旧 DOM 不会被按新下标测量', async () => {
    const fixture = setup({ count: 100, overscan: 0 });

    await settle(fixture.syncDom);

    fixture.setRowHeight(0, 60);

    await settle(fixture.syncDom);

    expect(fixture.api.totalSize.value).toBe('2040px');

    fixture.viewport.scrollTop = 100;
    fixture.viewport.dispatchEvent(new Event('scroll'));

    // 故意不 syncDom：rAF 里目标区间已提交，但 DOM 仍是上一轮 0..3。
    await flushFrame();

    expect(fixture.api.totalSize.value).toBe('2040px');
    expect(fixture.api.visibleIndices.value).toEqual([3, 4, 5, 6, 7, 8]);

    await settle(fixture.syncDom);

    expect(fixture.api.totalSize.value).toBe('2040px');
  });

  it('视口首项及其下方的行长高不补偿滚动位置', async () => {
    const fixture = setup({ count: 100, overscan: 3 });

    await scrollTo(fixture, 400);

    // 第 20 项正压在锚点上，第 25 项在它下方：两者长高都属于「正在看的内容自己变高」，
    // 用滚动位置去抵消只会让正在阅读的行跟着跳。
    fixture.setRowHeight(20, 90);
    fixture.setRowHeight(25, 90);

    await settle(fixture.syncDom);

    expect(fixture.viewport.scrollTop).toBe(400);
    expect(fixture.api.totalSize.value).toBe(`${100 * ESTIMATE + 70 + 70}px`);
  });

  it('一帧内多行同时变矮时补偿按净变化只写一次', async () => {
    const fixture = setup({ count: 100, overscan: 3 });

    await scrollTo(fixture, 200);

    expect(fixture.api.startIndex.value).toBe(7);

    // 第 8、9 两行都在锚点（第 10 项）之上、一次回调内变矮：净变化 -32，落点 168；
    // 逐行写两次滚动位置会得到同样的终点，但中间多一次强制布局，
    // 而重复应用同一笔补偿会得到 136。
    fixture.setRowHeight(8, 4);
    fixture.setRowHeight(9, 4);

    await settle(fixture.syncDom);

    expect(fixture.viewport.scrollTop).toBe(168);
    expect(fixture.api.scrollTop.value).toBe(168);
    expect(fixture.api.totalSize.value).toBe(`${4 + 4 + 98 * ESTIMATE}px`);
  });

  it('测量收敛后停下，不会每帧重复提交', async () => {
    const fixture = setup({ count: 60, overscan: 0 });

    fixture.setRowHeight(0, 120);

    await settle(fixture.syncDom);

    const stable = fixture.api.totalSize.value;

    await settle(fixture.syncDom, 6);

    expect(fixture.api.totalSize.value).toBe(stable);
    expect(fixture.api.startIndex.value).toBe(0);
  });

  it('稳定后不再排新帧：区间提交去重是收敛的前提', async () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    const fixture = setup({ count: 60, overscan: 3 });

    await settle(fixture.syncDom);

    const before = raf.mock.calls.length;

    // settle 的轮数是 6，每轮只应花掉它自己那一次 rAF；实现若还在自重排帧，
    // 差值会随轮数线性增长——那就是「测量 → 提交 → 再测量」的每帧循环。
    await settle(fixture.syncDom, 6);

    expect(raf.mock.calls.length - before).toBeLessThanOrEqual(6);

    raf.mockRestore();
  });
});

describe('useVirtualList 数据变化', () => {
  it('尾部追加保留已测高度，新增项回落到估算', async () => {
    const count = ref(20);
    const fixture = setup({ count: () => count.value, overscan: 0 });

    fixture.setRowHeight(0, 100);

    await settle(fixture.syncDom);

    expect(fixture.api.totalSize.value).toBe('480px');

    // 把第 0 行滚出渲染区间：它已经不在 DOM 里，高度结论只能来自 measured 那本账。
    // 少了这一步，「保留已测高度」会被随后重新渲染时的再测量掩盖，测不出记账有没有生效。
    await scrollTo(fixture, 400);

    expect(fixture.api.startIndex.value).toBe(16);

    count.value = 30;

    await settle(fixture.syncDom);

    // 第 0 项仍是 100，其余 29 项按估算 20：记账丢失的话会得到 30 * 20 = 600。
    expect(fixture.api.totalSize.value).toBe(`${100 + 29 * ESTIMATE}px`);
  });

  it('项数骤减时截断累计高度并按新项数重算总高', async () => {
    const count = ref(200);
    const fixture = setup({ count: () => count.value, overscan: 0 });

    await scrollTo(fixture, 2_000);

    expect(fixture.api.startIndex.value).toBe(100);

    count.value = 5;
    fixture.syncDom();

    await settle(fixture.syncDom);

    expect(fixture.api.totalSize.value).toBe('100px');
    expect(Number.isFinite(Number.parseFloat(fixture.api.totalSize.value))).toBe(true);
    expect(fixture.api.endIndex.value).toBeLessThan(5);
    expect(fixture.api.visibleIndices.value).toEqual([4]);
  });

  it('骤减后 DOM 里残留的旧行不会被写成别的项的测量结论', async () => {
    const count = ref(200);
    const fixture = setup({ count: () => count.value, overscan: 0 });

    await scrollTo(fixture, 2_000);

    fixture.setRowHeight(100, 90);
    fixture.setRowHeight(101, 90);
    fixture.setRowHeight(102, 90);

    await settle(fixture.syncDom);

    expect(fixture.api.totalSize.value).toBe(`${200 * ESTIMATE + 70 + 70 + 70}px`);

    const frames: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);

      return frames.length;
    });

    count.value = 5;
    fixture.viewport.dispatchEvent(new Event('scroll'));

    // 同步执行 rAF，模拟 Vue patch 前：状态已缩到 5 项，DOM 仍是深滚动区的旧行。
    const pending = frames.shift();

    if (!pending) throw new Error('项数变化后没有排入测量帧');

    pending(0);
    raf.mockRestore();

    count.value = 10;

    await settle(fixture.syncDom);

    expect(fixture.api.totalSize.value).toBe(`${10 * ESTIMATE}px`);
  });

  it('项数变化当帧就重建树，同一 tick 内的读取与跳转用的是新树', async () => {
    const count = ref(200);
    const fixture = setup({ count: () => count.value, overscan: 0 });

    count.value = 5;

    // 「改数据 + 立刻编程滚动」是用户的真实调用顺序：建树若留给 pre 队列，这一 tick 里
    // 读到的总高还是 200 项的 4000px，scrollToIndex 也会按旧树的前缀和落到空白处。
    expect(fixture.api.totalSize.value).toBe('100px');

    fixture.api.scrollToIndex(120);

    expect(fixture.viewport.scrollTop).toBe(80);

    await settle(fixture.syncDom);

    expect(fixture.api.startIndex.value).toBe(4);
    expect(fixture.api.totalSize.value).toBe('100px');
  });

  it('稳定 key 的实测高度跟随重排，不留在原下标', async () => {
    const order = ref([0, 1, 2, 3, 4]);
    const fixture = setup({
      count: 5,
      getItemKey: (index) => `item-${order.value[index]}`,
      overscan: 0,
    });

    await settle(fixture.syncDom);

    fixture.setRowHeight(0, 60);

    await settle(fixture.syncDom);
    await scrollTo(fixture, 70);

    expect(fixture.api.paddingTop.value).toBe('60px');

    order.value = [1, 0, 2, 3, 4];
    await nextTick();

    // item-0 的 60px 随它移动到下标 1；首项变成 20px，而不是沿用旧下标 0 的 60px。
    expect(fixture.api.totalSize.value).toBe('140px');
    expect(fixture.api.paddingTop.value).toBe('20px');

    fixture.api.scrollToIndex(1);

    expect(fixture.viewport.scrollTop).toBe(20);
  });

  it('预估高度变化后未测量项跟着调整，已测项保持不变', async () => {
    const estimate = ref(ESTIMATE);
    const fixture = setup({ count: 20, estimateSize: () => estimate.value, overscan: 0 });

    fixture.setRowHeight(0, 100);

    await settle(fixture.syncDom);

    estimate.value = 50;

    await settle(fixture.syncDom);

    // 第 0 项已测得 100，不受新估算影响；其余 19 项按 50 计。
    expect(fixture.api.totalSize.value).toBe(`${100 + 19 * 50}px`);
  });

  it('invalidateMeasurements 丢弃全部测量结论，回到估算总高', async () => {
    const fixture = setup({ count: 10, overscan: 0 });

    fixture.setRowHeight(0, 100);

    await settle(fixture.syncDom);

    expect(fixture.api.totalSize.value).toBe('280px');

    fixture.api.invalidateMeasurements();

    // 丢弃结论这一步是同步的：树当场回到「全部按估算」的总高。
    expect(fixture.api.totalSize.value).toBe('200px');

    await settle(fixture.syncDom);

    // 第 0 项仍在 DOM 里，会被重新量回 100：整份替换数据后由现存行重建测量结论，是预期行为。
    expect(fixture.api.totalSize.value).toBe('280px');
  });
});

describe('useVirtualList 编程式滚动', () => {
  it('scrollToIndex 用前缀和直接定位，目标项尚未渲染也能跳', async () => {
    const fixture = setup({ count: 5_000, overscan: 0 });

    await settle(fixture.syncDom);

    fixture.api.scrollToIndex(2_000);

    await settle(fixture.syncDom);

    expect(fixture.viewport.scrollTop).toBe(2_000 * ESTIMATE);
    expect(fixture.api.startIndex.value).toBe(2_000);
  });

  it('scrollToIndex 越界时下钳 0、上钳末项', async () => {
    const fixture = setup({ count: 50, overscan: 0 });

    await scrollTo(fixture, 400);

    fixture.api.scrollToIndex(-10);

    await settle(fixture.syncDom);

    expect(fixture.viewport.scrollTop).toBe(0);

    fixture.api.scrollToIndex(9_999);

    await settle(fixture.syncDom);

    expect(fixture.api.startIndex.value).toBe(49);
  });

  it('已量出真实高度的项参与定位时按真实累计值', async () => {
    const fixture = setup({ count: 100, overscan: 0 });

    fixture.setRowHeight(0, 200);

    await settle(fixture.syncDom);

    fixture.api.scrollToIndex(2);

    await settle(fixture.syncDom);

    // 第 0 项真实 200，第 1 项仍按估算 20。
    expect(fixture.viewport.scrollTop).toBe(220);
  });

  it('scrollToOffset 写内容坐标，负值按 0 处理', async () => {
    const fixture = setup({ count: 100, overscan: 0 });

    await settle(fixture.syncDom);

    fixture.api.scrollToOffset(-500);

    await settle(fixture.syncDom);

    expect(fixture.viewport.scrollTop).toBe(0);

    fixture.api.scrollToOffset(320);

    await settle(fixture.syncDom);

    expect(fixture.api.startIndex.value).toBe(16);
  });
});

describe('useVirtualList 资源释放', () => {
  it('scope 停止后不再响应后续滚动事件', async () => {
    const fixture = setup({ count: 100, overscan: 0 });

    await settle(fixture.syncDom);

    fixture.scope.stop();

    fixture.viewport.scrollTop = 500;
    fixture.viewport.dispatchEvent(new Event('scroll'));

    await nextTick();
    await flushFrame();

    expect(fixture.api.scrollTop.value).toBe(0);
  });

  it('销毁时取消未执行的帧任务', async () => {
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const scope = effectScope();
    const api = scope.run(() => useVirtualList({ count: 20, estimateSize: ESTIMATE }));

    if (!api) throw new Error('composable 未在 effect scope 内创建');

    // 没有容器也要排上一帧：这样 stop 才有未执行的帧任务可取消。
    api.invalidateMeasurements();
    scope.stop();

    expect(cancel).toHaveBeenCalled();
  });

  it('容器换成 null 时移除监听并清零视口度量', async () => {
    const fixture = setup({ count: 40, overscan: 0 });

    await scrollTo(fixture, 200);

    fixture.api.setViewportElement(null);

    await nextTick();
    await flushFrame();

    expect(fixture.api.scrollTop.value).toBe(0);
    expect(fixture.api.viewportSize.value).toBe(0);
    expect(fixture.observer.has(fixture.viewport)).toBe(false);
  });
});
