import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { VirtualList } from '../src/virtual-list';

import type { App, ComputedRef, Ref } from 'vue';

/**
 * 只声明本文件真正用到的那部分 expose。
 *
 * `defineExpose` 交出来的是代理过的实例，属性上的 ref 在读取时已经解包，所以这里写成值而不是
 * `Ref` / `ComputedRef`——按 Ref 声明会让测试去访问一个不存在的 `.value`，红的还不是被测行为。
 */
interface ListApi {
  startIndex: number;
  endIndex: number;
  visibleIndices: number[];
  totalSize: string;
  scrollTop: number;
  viewportSize: number;
  scrollToIndex(index: number): void;
  scrollIntoView(index: number): void;
  scrollToOffset(offset: number): void;
  invalidateMeasurements(): void;
}

interface Fixture {
  host: HTMLElement;
  api: ListApi;
  viewport: HTMLElement;
  content: HTMLElement;
  rows(): HTMLElement[];
  /** 渲染区间首项的下标。 */
  firstRowIndex(): number;
  setCount(count: number): void;
  setItems(items: Item[]): void;
  flush(rounds?: number): Promise<void>;
  scrollTo(offset: number): Promise<void>;
}

const apps: Array<{ app: App; api: Ref<ListApi | null> }> = [];

/** jsdom 不做布局，视口高度与行高都要桩；估算统一用 20，期望值能口算复核。 */
const VIEWPORT = 100;

const ESTIMATE = 20;

type Item = { id: number; label: string };

/**
 * jsdom 没有布局：`offsetHeight` 默认返回 0。这会让被测实现先量到 0、再被我桩成估算高，
 * 于是每帧都对「上方行」做一次 −20 / +20 的补偿往返——那是任何浏览器都给不出的高度序列，
 * 测出来的抖动是脚手架的问题，不是组件的问题。所以把缺省值挂到原型上：没显式桩过的行
 * 一律报估算高，只有测试明确指定过的行才报别的值。
 */
const rowHeights = new WeakMap<HTMLElement, number>();

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get(this: HTMLElement) {
    return rowHeights.get(this) ?? ESTIMATE;
  },
});

function makeItems(count: number): Item[] {
  return Array.from({ length: count }, (_, index) => ({ id: index, label: `#${index}` }));
}

function setup(options: {
  count: number;
  props?: Record<string, unknown>;
  rowHeight?: (index: number) => number;
}): Fixture {
  const items = ref<Item[]>(makeItems(options.count));
  const api = ref<ListApi | null>(null);
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          VirtualList,
          {
            items: items.value,
            estimateSize: ESTIMATE,
            ...options.props,
            ref: api,
          },
          {
            default: (slotProps: { item: Item; index: number }) => [
              h('span', { class: 'cell' }, slotProps.item.label),
            ],
          }
        ),
    })
  );

  app.mount(host);
  apps.push({ app, api });

  if (!api.value) throw new Error('VirtualList 未暴露无头层入口');

  const viewport = host.querySelector<HTMLElement>('[data-part="viewport"]');
  const content = host.querySelector<HTMLElement>('[data-part="content"]');

  if (!viewport || !content) throw new Error('缺少 viewport / content 两层结构');

  Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: VIEWPORT });
  Object.defineProperty(viewport, 'scrollTop', { configurable: true, writable: true, value: 0 });

  function rows(): HTMLElement[] {
    return Array.from(content.children) as HTMLElement[];
  }

  /** Vue patch 完、下一次读布局之前，把当前在屏的行高登记上。 */
  function stubRowHeights(): void {
    for (const row of rows()) {
      const index = Number(row.getAttribute('aria-posinset')) - 1;

      rowHeights.set(row, options.rowHeight?.(index) ?? ESTIMATE);
    }
  }

  async function flush(rounds = 4): Promise<void> {
    for (let round = 0; round < rounds; round += 1) {
      await nextTick();
      stubRowHeights();
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
    }

    await nextTick();
  }

  async function scrollTo(offset: number): Promise<void> {
    viewport.scrollTop = offset;
    viewport.dispatchEvent(new Event('scroll'));

    await flush();
  }

  return {
    host,
    api: api.value,
    viewport,
    content,
    rows,
    firstRowIndex: () => Number(rows()[0]?.getAttribute('aria-posinset')) - 1,
    setCount: (count) => {
      items.value = makeItems(count);
    },
    setItems: (next) => {
      items.value = next;
    },
    flush,
    scrollTo,
  };
}

afterEach(() => {
  for (const { app } of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('VirtualList 结构与可访问性', () => {
  it('两层结构 + list / listitem 语义，行号与总数写进 aria', async () => {
    const fixture = setup({ count: 1000, props: { overscan: 0 } });

    await fixture.flush();

    expect(fixture.content.getAttribute('role')).toBe('list');
    expect(fixture.rows()).toHaveLength(6);

    for (const [position, row] of fixture.rows().entries()) {
      expect(row.getAttribute('role')).toBe('listitem');
      expect(row.getAttribute('aria-posinset')).toBe(String(position + 1));
      expect(row.getAttribute('aria-setsize')).toBe('1000');
    }
  });

  it('aria-* 透传到 role=list，class/style 仍落在 viewport', async () => {
    const fixture = setup({
      count: 3,
      props: {
        'aria-label': '节点列表',
        'aria-describedby': 'list-help',
        class: 'host-list',
        style: { width: '240px' },
        overscan: 9,
      },
    });

    await fixture.flush();

    expect(fixture.viewport.hasAttribute('aria-label')).toBe(false);
    expect(fixture.viewport.hasAttribute('aria-describedby')).toBe(false);
    expect(fixture.content.getAttribute('aria-label')).toBe('节点列表');
    expect(fixture.content.getAttribute('aria-describedby')).toBe('list-help');
    expect(fixture.viewport.classList.contains('host-list')).toBe(true);
    expect(fixture.viewport.style.width).toBe('240px');
  });

  it('行插槽拿到与下标对应的数据', async () => {
    const fixture = setup({ count: 1000, props: { overscan: 0 } });

    await fixture.flush();
    await fixture.scrollTo(400);

    const cells = Array.from(fixture.host.querySelectorAll('.cell'));

    expect(cells.map((cell) => cell.textContent)).toEqual([
      '#20',
      '#21',
      '#22',
      '#23',
      '#24',
      '#25',
    ]);
  });

  it('区间移动一行时，活下来的元素仍然是同一项', async () => {
    const fixture = setup({ count: 1000, props: { overscan: 0 } });

    await fixture.flush();

    const before = new Map(fixture.rows().map((row) => [row, row.getAttribute('aria-posinset')]));

    await fixture.scrollTo(20);

    const survivors = fixture.rows().filter((row) => before.has(row));

    // 窗口从 0..5 移到 1..6：key 用下标，所以只有 1..5 这五项的元素能留下来，且各自的下标不变。
    // 去掉 key 后 Vue 按位置复用，六个元素全部留下并被改写成后一项的数据——焦点、文本选中
    // 与行内异步状态都会跟着错位，而树上没有任何机制能发现这种错位。
    expect(survivors).toHaveLength(5);

    for (const row of survivors) {
      expect(row.getAttribute('aria-posinset')).toBe(before.get(row));
    }
  });

  it('itemKey 让同长度重排保留数据身份对应的 DOM', async () => {
    const fixture = setup({
      count: 3,
      props: { itemKey: (item: Item) => item.id, overscan: 9 },
    });

    await fixture.flush();

    const before = fixture.rows();
    const items = makeItems(3);

    fixture.setItems([items[1], items[0], items[2]]);

    await fixture.flush();

    expect(fixture.rows()[1]).toBe(before[0]);
    expect(fixture.rows()[0]).toBe(before[1]);
    expect(fixture.rows()[1]?.getAttribute('aria-posinset')).toBe('2');
    expect(fixture.api.totalSize).toBe('60px');
  });

  it('空数据不渲染行，两层结构仍然在', async () => {
    const fixture = setup({ count: 0, props: { overscan: 0 } });

    await fixture.flush();

    expect(fixture.rows()).toHaveLength(0);
    expect(fixture.api.visibleIndices).toEqual([]);
    expect(fixture.content.style.paddingTop).toBe('0px');
  });

  it('功能性样式在本层：可滚、padding 定位、content-box、不钉 height', async () => {
    const fixture = setup({ count: 1000, props: { overscan: 0 } });

    await fixture.flush();
    await fixture.scrollTo(200);

    expect(fixture.viewport.style.overflowY).toBe('auto');
    expect(fixture.content.style.boxSizing).toBe('content-box');
    expect(fixture.content.style.paddingTop).toBe('200px');
    expect(fixture.content.style.paddingBottom).not.toBe('');
    // flow 布局下总高由 padding + 行实际高相加得到，钉死 height 会把渲染行算两遍。
    expect(fixture.content.style.height).toBe('');
  });

  it('height 数字按 px、字符串原样、不传则留给样式层', async () => {
    const numeric = setup({ count: 10, props: { height: 320, overscan: 0 } });
    const textual = setup({ count: 10, props: { height: '60vh', overscan: 0 } });
    const absent = setup({ count: 10, props: { overscan: 0 } });

    expect(numeric.viewport.style.height).toBe('320px');
    expect(textual.viewport.style.height).toBe('60vh');
    expect(absent.viewport.style.height).toBe('');
  });
});

describe('VirtualList 渲染区间', () => {
  it('默认 overscan 前后各多渲染三项', async () => {
    const without = setup({ count: 1000, props: { overscan: 0 } });
    const withDefault = setup({ count: 1000 });

    await without.flush();
    await withDefault.flush();

    // 视口 100 / 估算 20 → 可见 0..5；下沿按 `<=` 多算一项，所以下方还要再补三项预渲染。
    expect(without.api.visibleIndices).toEqual([0, 1, 2, 3, 4, 5]);
    expect(withDefault.api.visibleIndices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('行比估算高时渲染的行数随之减少，说明实测高进了树', async () => {
    const fixture = setup({
      count: 1000,
      props: { overscan: 0 },
      rowHeight: () => 40,
    });

    await fixture.flush();
    await fixture.scrollTo(200);

    // 首屏 0..5 已实测为 40；滚动到 200 时第 5 项压在视口上沿，100px 视口容纳 3 项。
    expect(fixture.firstRowIndex()).toBe(5);
    expect(fixture.rows()).toHaveLength(3);
    expect(fixture.content.style.paddingTop).toBe('200px');
  });

  it('estimateSize 决定首屏区间与总高', async () => {
    const fixture = setup({ count: 100, props: { estimateSize: 50, overscan: 0 } });

    // 行高桩统一按 20 给出，但这一项没传 rowHeight：首屏按 50 估算装 3 行，
    // 量到 20 之后区间扩到 6 行，验证「估算值只撑住位置、实测才算数」。
    await fixture.flush();

    expect(fixture.rows()).toHaveLength(6);
    // 没渲染过的 94 项仍按 50 记账：估算的作用域止于未测量区段，不跟着实测结论一起改。
    expect(fixture.content.style.paddingBottom).toBe(`${(100 - 6) * 50}px`);
  });
});

describe('VirtualList 数据变化', () => {
  it('尾部追加后 aria-setsize 与下 padding 同步更新', async () => {
    const fixture = setup({ count: 1000, props: { overscan: 0 } });

    await fixture.flush();

    const before = fixture.content.style.paddingBottom;

    fixture.setCount(2000);

    await fixture.flush();

    expect(fixture.rows()[fixture.rows().length - 1].getAttribute('aria-setsize')).toBe('2000');
    expect(Number.parseFloat(fixture.content.style.paddingBottom)).toBeGreaterThan(
      Number.parseFloat(before)
    );
  });

  it('invalidateMeasurements 清掉实测结论后仍能收敛回实测总高', async () => {
    const fixture = setup({
      count: 1000,
      props: { overscan: 0 },
      rowHeight: () => 40,
    });

    await fixture.flush();

    const measured = fixture.rows().length;

    fixture.api.invalidateMeasurements();

    await fixture.flush();

    // 未渲染的项回落到估算、在屏的行立刻被重量回 40：区间恢复，不留下抖动。
    expect(fixture.rows()).toHaveLength(measured);
  });
});

describe('VirtualList 编程式滚动', () => {
  it('scrollToIndex 写内容坐标并让目标行成为区间首项', async () => {
    const fixture = setup({ count: 5000, props: { overscan: 0 } });

    await fixture.flush();

    fixture.api.scrollToIndex(2000);

    await fixture.flush();

    expect(fixture.viewport.scrollTop).toBe(2000 * ESTIMATE);
    expect(fixture.firstRowIndex()).toBe(2000);
  });

  it('scrollIntoView 用最小位移把目标项带进视口', async () => {
    const fixture = setup({ count: 100, props: { overscan: 0 } });

    await fixture.flush();
    await fixture.scrollTo(400);

    fixture.api.scrollIntoView(5);
    await fixture.flush();

    expect(fixture.viewport.scrollTop).toBe(100);
    expect(fixture.firstRowIndex()).toBe(5);

    fixture.api.scrollIntoView(30);
    await fixture.flush();

    expect(fixture.viewport.scrollTop).toBe(520);
    expect(fixture.firstRowIndex()).toBe(26);
  });

  it('scrollToOffset 负值钳到 0，不靠容器的隐式行为', async () => {
    const fixture = setup({ count: 1000, props: { overscan: 0 } });

    await fixture.flush();
    await fixture.scrollTo(200);

    expect(fixture.firstRowIndex()).toBe(10);

    fixture.api.scrollToOffset(-500);

    await fixture.flush();

    expect(fixture.viewport.scrollTop).toBe(0);
    expect(fixture.api.scrollTop).toBe(0);
    expect(fixture.firstRowIndex()).toBe(0);
  });
});
